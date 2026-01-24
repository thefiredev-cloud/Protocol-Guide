/**
 * Admin Router
 * Handles admin-only procedures for feedback, users, and audit logs
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const adminRouter = router({
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
        entityType: "feedback",
        entityId: String(input.feedbackId),
        metadata: {
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
        entityType: "user",
        entityId: String(input.userId),
        metadata: {
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
        entityType: "contact",
        entityId: String(input.submissionId),
        metadata: {
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
});

export type AdminRouter = typeof adminRouter;
