/**
 * Agency Admin Router
 * Composes all agency management sub-routers
 *
 * Sub-modules:
 * - agency: Agency CRUD operations
 * - staff: Member management
 * - protocols: Protocol upload and workflow
 * - versions: Version control
 */

import { router } from "../../_core/trpc";
import { agencyProcedures } from "./agency";
import { staffProcedures } from "./staff";
import { protocolProcedures } from "./protocols";
import { versionProcedures } from "./versions";

export const agencyAdminRouter = router({
  // Agency management
  myAgencies: agencyProcedures.myAgencies,
  getAgency: agencyProcedures.getAgency,
  updateAgency: agencyProcedures.updateAgency,

  // Staff management
  listMembers: staffProcedures.listMembers,
  inviteMember: staffProcedures.inviteMember,
  updateMemberRole: staffProcedures.updateMemberRole,
  removeMember: staffProcedures.removeMember,

  // Protocol management
  listProtocols: protocolProcedures.listProtocols,
  uploadProtocol: protocolProcedures.uploadProtocol,
  getUploadStatus: protocolProcedures.getUploadStatus,
  updateProtocolStatus: protocolProcedures.updateProtocolStatus,
  publishProtocol: protocolProcedures.publishProtocol,
  archiveProtocol: protocolProcedures.archiveProtocol,

  // Version control
  listVersions: versionProcedures.listVersions,
  createVersion: versionProcedures.createVersion,
});
