import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export const deliveryState = v.union(v.literal("sending"), v.literal("sent"), v.literal("blocked"), v.literal("failed"));
export default defineSchema({
  trainers: defineTable({ phone: v.string(), name: v.string(), waitDays: v.number(), joinedAt: v.number() }).index("by_phone", ["phone"]),
  inbound: defineTable({ messageId: v.string(), trainerId: v.id("trainers"), text: v.string(), type: v.string(), receivedAt: v.number(), state: v.union(v.literal("queued"), v.literal("processing"), v.literal("processed"), v.literal("failed")), failure: v.optional(v.string()) }).index("by_message", ["messageId"]).index("by_trainer", ["trainerId"]),
  drafts: defineTable({ trainerId: v.id("trainers"), inboundId: v.id("inbound"), recommendation: v.string(), ask: v.string(), clientName: v.union(v.string(), v.null()), createdAt: v.number() }).index("by_inbound", ["inboundId"]).index("by_trainer", ["trainerId"]),
  outbound: defineTable({ trainerId: v.id("trainers"), source: v.string(), part: v.string(), payload: v.string(), state: deliveryState, createdAt: v.number(), providerMessageId: v.optional(v.string()), providerCode: v.optional(v.number()), failure: v.optional(v.string()) }).index("by_source_part", ["source", "part"]).index("by_trainer", ["trainerId"]),
  pending: defineTable({ trainerId: v.id("trainers"), draftId: v.id("drafts"), state: v.union(v.literal("scheduled"), v.literal("sending"), v.literal("awaiting_client"), v.literal("answered"), v.literal("blocked")), scheduledAt: v.number() }).index("by_draft", ["draftId"]).index("by_trainer", ["trainerId"]),
  clients: defineTable({ trainerId: v.id("trainers"), name: v.string(), startDate: v.string(), waitDays: v.number(), dueDate: v.string(), status: v.literal("due"), reminderUsed: v.boolean(), lastStepAt: v.number() }).index("by_trainer_name", ["trainerId", "name"]).index("by_trainer", ["trainerId"]),
});
