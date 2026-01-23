import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { invokeClaudeRAG, type ProtocolContext, type UserTier } from "./_core/claude";
import { semanticSearchProtocols } from "./_core/embeddings";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import * as db from "./db";
import * as dbUserCounties from "./db-user-counties";
import * as stripe from "./stripe";
import { mapCountyIdToAgencyId, getAgencyByCountyId } from "./db-agency-mapping";
import { TRPCError } from "@trpc/server";
import { agencyAdminRouter } from "./routers/agency-admin";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Counties router
  counties: router({
    list: publicProcedure.query(async () => {
      const counties = await db.getAllCounties();
      // Group by state
      const grouped: Record<string, typeof counties> = {};
      for (const county of counties) {
        if (!grouped[county.state]) {
          grouped[county.state] = [];
        }
        grouped[county.state].push(county);
      }
      return { counties, grouped };
    }),
    
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getCountyById(input.id);
      }),
  }),

  // User router
  user: router({
    usage: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserUsage(ctx.user.id);
    }),

    selectCounty: protectedProcedure
      .input(z.object({ countyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserCounty(ctx.user.id, input.countyId);
        return { success: true };
      }),

    queries: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
      .query(async ({ ctx, input }) => {
        return db.getUserQueries(ctx.user.id, input.limit);
      }),

    // Saved counties for tier-restricted access
    savedCounties: protectedProcedure.query(async ({ ctx }) => {
      const counties = await dbUserCounties.getUserCounties(ctx.user.id);
      const { canAdd, currentCount, maxAllowed, tier } = await dbUserCounties.canUserAddCounty(ctx.user.id);
      return {
        counties,
        canAdd,
        currentCount,
        maxAllowed,
        tier,
      };
    }),

    addCounty: protectedProcedure
      .input(z.object({
        countyId: z.number(),
        isPrimary: z.boolean().optional().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await dbUserCounties.addUserCounty(
          ctx.user.id,
          input.countyId,
          input.isPrimary
        );
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to add county",
          });
        }
        return result;
      }),

    removeCounty: protectedProcedure
      .input(z.object({ countyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await dbUserCounties.removeUserCounty(ctx.user.id, input.countyId);
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to remove county",
          });
        }
        return { success: true };
      }),

    setPrimaryCounty: protectedProcedure
      .input(z.object({ countyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await dbUserCounties.setUserPrimaryCounty(ctx.user.id, input.countyId);
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to set primary county",
          });
        }
        return { success: true };
      }),

    primaryCounty: protectedProcedure.query(async ({ ctx }) => {
      return dbUserCounties.getUserPrimaryCounty(ctx.user.id);
    }),
  }),

  // Semantic search router (public - no auth required for basic search)
  search: router({
    // Semantic search across all protocols using Voyage AI embeddings + pgvector
    semantic: publicProcedure
      .input(z.object({
        query: z.string().min(1).max(500),
        countyId: z.number().optional(),
        limit: z.number().min(1).max(50).default(10),
        stateFilter: z.string().optional(),
      }))
      .query(async ({ input }) => {
        // Use Voyage AI embeddings + Supabase pgvector for true semantic search
        // Map MySQL county ID to Supabase agency_id
        let agencyId: number | null = null;
        let agencyName: string | null = null;
        let stateCode: string | null = null;

        if (input.countyId) {
          // Map MySQL county ID -> Supabase agency_id
          agencyId = await mapCountyIdToAgencyId(input.countyId);

          // Get agency details for name/state filtering
          const agency = await getAgencyByCountyId(input.countyId);
          if (agency) {
            agencyName = agency.name;
            stateCode = agency.state_code;
          }

          console.log(`[Search] Mapped MySQL county ${input.countyId} -> Supabase agency ${agencyId}`);
        } else if (input.stateFilter) {
          // State-only filter (no specific county)
          stateCode = input.stateFilter;
        }

        const results = await semanticSearchProtocols({
          query: input.query,
          agencyId,
          agencyName,
          stateCode,
          limit: input.limit,
          threshold: 0.3,
        });

        return {
          results: results.map(r => ({
            id: r.id,
            protocolNumber: r.protocol_number,
            protocolTitle: r.protocol_title,
            section: r.section,
            content: r.content.substring(0, 500) + (r.content.length > 500 ? '...' : ''),
            fullContent: r.content,
            sourcePdfUrl: null, // pgvector results don't include this
            relevanceScore: r.similarity,
            countyId: r.agency_id,
            // Protocol currency information not in pgvector results
            protocolEffectiveDate: null,
            lastVerifiedAt: null,
            protocolYear: null,
          })),
          totalFound: results.length,
          query: input.query,
        };
      }),
    
    // Get protocol by ID
    getProtocol: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return null;
        
        const { protocolChunks } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const [protocol] = await dbInstance.select().from(protocolChunks)
          .where(eq(protocolChunks.id, input.id))
          .limit(1);
        
        return protocol || null;
      }),
    
    // Get protocol statistics
    stats: publicProcedure.query(async () => {
      return db.getProtocolStats();
    }),
    
    // Get protocol coverage by state
    coverageByState: publicProcedure.query(async () => {
      return db.getProtocolCoverageByState();
    }),
    
    // Get total protocol statistics
    totalStats: publicProcedure.query(async () => {
      return db.getTotalProtocolStats();
    }),
    
    // Get agencies (counties) by state with protocol counts
    agenciesByState: publicProcedure
      .input(z.object({ state: z.string() }))
      .query(async ({ input }) => {
        return db.getAgenciesByState(input.state);
      }),
    
    // Get all agencies with protocols (optionally filtered by state)
    agenciesWithProtocols: publicProcedure
      .input(z.object({ state: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.getAgenciesWithProtocols(input?.state);
      }),
    
    // Search by specific agency using Voyage AI + pgvector
    searchByAgency: publicProcedure
      .input(z.object({
        query: z.string().min(1).max(500),
        agencyId: z.number(), // MySQL county ID (will be mapped)
        limit: z.number().min(1).max(50).default(10),
      }))
      .query(async ({ input }) => {
        // Map MySQL county ID -> Supabase agency_id
        const supabaseAgencyId = await mapCountyIdToAgencyId(input.agencyId);

        // Get agency details
        const agency = await getAgencyByCountyId(input.agencyId);
        const agencyName = agency?.name || null;
        const stateCode = agency?.state_code || null;

        console.log(`[Search] Agency search - MySQL ${input.agencyId} -> Supabase ${supabaseAgencyId}`);

        const results = await semanticSearchProtocols({
          query: input.query,
          agencyId: supabaseAgencyId,
          agencyName,
          stateCode,
          limit: input.limit,
          threshold: 0.3,
        });

        return {
          results: results.map(r => ({
            id: r.id,
            protocolNumber: r.protocol_number,
            protocolTitle: r.protocol_title,
            section: r.section,
            content: r.content.substring(0, 500) + (r.content.length > 500 ? '...' : ''),
            fullContent: r.content,
            sourcePdfUrl: null,
            relevanceScore: r.similarity,
            countyId: r.agency_id,
            protocolEffectiveDate: null,
            lastVerifiedAt: null,
            protocolYear: null,
          })),
          totalFound: results.length,
          query: input.query,
        };
      }),
  }),

  // Protocol query router
  query: router({
    submit: protectedProcedure
      .input(z.object({
        countyId: z.number(),
        queryText: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        const startTime = Date.now();

        // Check usage limits
        const canQuery = await db.canUserQuery(ctx.user.id);
        if (!canQuery) {
          return {
            success: false,
            error: "Daily query limit reached. Upgrade to Pro for unlimited queries.",
            response: null,
          };
        }

        // Get user tier for model routing
        const user = await db.getUserById(ctx.user.id);
        const userTier: UserTier = (user?.tier as UserTier) || 'free';

        // Get agency name for context
        const county = await db.getCountyById(input.countyId);
        const agencyName = county?.name || 'Unknown Agency';

        try {
          // Semantic search with Voyage AI embeddings
          // Filter by agency name (from MySQL county lookup)
          const searchResults = await semanticSearchProtocols({
            query: input.queryText,
            agencyName: agencyName !== 'Unknown Agency' ? agencyName : null,
            limit: 10,
            threshold: 0.3,
          });

          if (searchResults.length === 0) {
            return {
              success: false,
              error: "No matching protocols found. Try rephrasing your query.",
              response: null,
            };
          }

          // Convert to ProtocolContext format for Claude
          const protocols: ProtocolContext[] = searchResults.map(r => ({
            id: r.id,
            protocolNumber: r.protocol_number,
            protocolTitle: r.protocol_title,
            section: r.section,
            content: r.content,
            imageUrls: r.image_urls,
            similarity: r.similarity,
          }));

          // Invoke Claude with tiered routing (Haiku for free/simple, Sonnet for complex Pro)
          const claudeResponse = await invokeClaudeRAG({
            query: input.queryText,
            protocols,
            userTier,
            agencyName,
          });

          const protocolRefs = protocols.map(p => `${p.protocolNumber} - ${p.protocolTitle}`);
          const responseTimeMs = Date.now() - startTime;

          // Log the query
          await db.createQuery({
            userId: ctx.user.id,
            countyId: input.countyId,
            queryText: input.queryText,
            responseText: claudeResponse.content,
            protocolRefs,
          });

          // Increment usage
          await db.incrementUserQueryCount(ctx.user.id);

          return {
            success: true,
            error: null,
            response: {
              text: claudeResponse.content,
              protocolRefs,
              model: claudeResponse.model,
              tokens: {
                input: claudeResponse.inputTokens,
                output: claudeResponse.outputTokens,
              },
              responseTimeMs,
            },
          };
        } catch (error) {
          console.error('Query error:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Query failed',
            response: null,
          };
        }
      }),
    
    history: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
      .query(async ({ ctx, input }) => {
        return db.getUserQueries(ctx.user.id, input.limit);
      }),

    // Search history for cloud sync (Pro feature)
    searchHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
      .query(async ({ ctx, input }) => {
        return dbUserCounties.getUserSearchHistory(ctx.user.id, input.limit);
      }),

    // Sync local search history to cloud (Pro feature)
    syncHistory: protectedProcedure
      .input(z.object({
        localQueries: z.array(z.object({
          queryText: z.string().min(1).max(500),
          countyId: z.number().optional(),
          timestamp: z.string().or(z.date()),
          deviceId: z.string().max(64).optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user is Pro/Enterprise
        const user = await db.getUserById(ctx.user.id);
        if (!user || user.tier === 'free') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Search history sync requires Pro subscription",
          });
        }

        const result = await dbUserCounties.syncSearchHistory(
          ctx.user.id,
          input.localQueries
        );

        return {
          success: result.success,
          merged: result.merged,
          serverHistory: result.serverHistory,
        };
      }),

    // Clear search history
    clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
      const result = await dbUserCounties.clearSearchHistory(ctx.user.id);
      return result;
    }),

    // Delete single history entry
    deleteHistoryEntry: protectedProcedure
      .input(z.object({ entryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await dbUserCounties.deleteSearchHistoryEntry(ctx.user.id, input.entryId);
        if (!result.success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: result.error || "Entry not found",
          });
        }
        return { success: true };
      }),
  }),

  // Voice transcription router
  voice: router({
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string(),
        language: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language,
          prompt: "Transcribe the EMS professional's voice query about medical protocols",
        });

        if ('error' in result) {
          return {
            success: false,
            error: result.error,
            text: null,
          };
        }

        return {
          success: true,
          error: null,
          text: result.text,
        };
      }),

    uploadAudio: protectedProcedure
      .input(z.object({
        audioBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const timestamp = Date.now();
        const extension = input.mimeType.split('/')[1] || 'webm';
        const key = `voice/${ctx.user.id}/${timestamp}.${extension}`;
        
        // Decode base64 to buffer
        const buffer = Buffer.from(input.audioBase64, 'base64');
        
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),
  }),

  // Feedback router for user submissions
  feedback: router({
    submit: protectedProcedure
      .input(z.object({
        category: z.enum(["error", "suggestion", "general"]),
        subject: z.string().min(1).max(255),
        message: z.string().min(1),
        protocolRef: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const user = await db.getUserById(ctx.user.id);
          await db.createFeedback({
            userId: ctx.user.id,
            category: input.category,
            subject: input.subject,
            message: input.message,
            protocolRef: input.protocolRef || null,
            countyId: user?.selectedCountyId || null,
          });
          return { success: true, error: null };
        } catch (error) {
          console.error("Failed to submit feedback:", error);
          return { success: false, error: "Failed to submit feedback" };
        }
      }),

    myFeedback: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFeedback(ctx.user.id);
    }),
  }),

  // Contact form submissions (public - no auth required)
  contact: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        message: z.string().min(10).max(5000),
      }))
      .mutation(async ({ input }) => {
        try {
          await db.createContactSubmission({
            name: input.name,
            email: input.email,
            message: input.message,
          });
          return { success: true, error: null };
        } catch (error) {
          console.error("Failed to submit contact form:", error);
          return { success: false, error: "Failed to submit. Please try again." };
        }
      }),
  }),

  // Subscription router for Stripe payments
  subscription: router({
    // Create checkout session for subscription
    createCheckout: protectedProcedure
      .input(z.object({
        plan: z.enum(["monthly", "annual"]),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await stripe.createCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email || "",
          plan: input.plan,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
        });

        if ('error' in result) {
          return { success: false, error: result.error, url: null };
        }

        return { success: true, error: null, url: result.url };
      }),

    // Create customer portal session for managing subscription
    createPortal: protectedProcedure
      .input(z.object({
        returnUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.stripeCustomerId) {
          return { success: false, error: "No subscription found", url: null };
        }

        const result = await stripe.createCustomerPortalSession({
          stripeCustomerId: ctx.user.stripeCustomerId,
          returnUrl: input.returnUrl,
        });

        if ('error' in result) {
          return { success: false, error: result.error, url: null };
        }

        return { success: true, error: null, url: result.url };
      }),

    // Get current subscription status
    status: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) {
        return {
          tier: "free" as const,
          subscriptionStatus: null,
          subscriptionEndDate: null,
        };
      }

      return {
        tier: user.tier,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
      };
    }),
  }),

  // Admin router - requires admin role
  admin: router({
    // List all feedback with optional status filter and pagination
    listFeedback: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "reviewed", "resolved", "dismissed"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const { status, limit, offset } = input || {};
        return db.getAllFeedbackPaginated({ status, limit, offset });
      }),

    // Update feedback status and admin notes
    updateFeedback: adminProcedure
      .input(z.object({
        feedbackId: z.number(),
        status: z.enum(["pending", "reviewed", "resolved", "dismissed"]),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get current feedback to log the change
        const currentFeedback = await db.getFeedbackById(input.feedbackId);
        if (!currentFeedback) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Feedback not found",
          });
        }

        const oldStatus = currentFeedback.status;

        // Update feedback
        await db.updateFeedbackStatus(input.feedbackId, input.status, input.adminNotes);

        // Log audit event
        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "FEEDBACK_STATUS_CHANGED",
          targetType: "feedback",
          targetId: String(input.feedbackId),
          details: {
            oldStatus,
            newStatus: input.status,
            adminNotes: input.adminNotes,
          },
        });

        return { success: true };
      }),

    // List all users with optional filters and pagination
    listUsers: adminProcedure
      .input(z.object({
        tier: z.enum(["free", "pro", "enterprise"]).optional(),
        role: z.enum(["user", "admin"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const { tier, role, limit, offset } = input || {};
        return db.getAllUsersPaginated({ tier, role, limit, offset });
      }),

    // Update a user's role
    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Cannot change own role
        if (input.userId === ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot change your own role",
          });
        }

        // Get current user to log the change
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const oldRole = targetUser.role;

        // Update role
        await db.updateUserRole(input.userId, input.role);

        // Log audit event
        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "USER_ROLE_CHANGED",
          targetType: "user",
          targetId: String(input.userId),
          details: {
            targetEmail: targetUser.email,
            oldRole,
            newRole: input.role,
          },
        });

        return { success: true };
      }),

    // List contact form submissions with optional status filter and pagination
    listContactSubmissions: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "reviewed", "resolved"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const { status, limit, offset } = input || {};
        return db.getAllContactSubmissionsPaginated({ status, limit, offset });
      }),

    // Update contact submission status
    updateContactStatus: adminProcedure
      .input(z.object({
        submissionId: z.number(),
        status: z.enum(["pending", "reviewed", "resolved"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get current submission to log the change
        const currentSubmission = await db.getContactSubmissionById(input.submissionId);
        if (!currentSubmission) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contact submission not found",
          });
        }

        const oldStatus = currentSubmission.status;

        // Update status
        await db.updateContactSubmissionStatus(input.submissionId, input.status);

        // Log audit event
        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "CONTACT_STATUS_CHANGED",
          targetType: "contact",
          targetId: String(input.submissionId),
          details: {
            contactEmail: currentSubmission.email,
            oldStatus,
            newStatus: input.status,
          },
        });

        return { success: true };
      }),

    // Get audit logs (admin can view all audit logs)
    getAuditLogs: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const { limit, offset } = input || {};
        return db.getAuditLogs({ limit, offset });
      }),
  }),

  // Agency Admin router for B2B agency management
  agencyAdmin: agencyAdminRouter,
});

export type AppRouter = typeof appRouter;
