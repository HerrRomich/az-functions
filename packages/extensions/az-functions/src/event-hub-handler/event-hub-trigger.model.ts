import * as z from 'zod';

const partitionContextSchema = z.object({
  fullyQualifiedNamespace: z.string(),
  consumerGroup: z.string(),
  eventHubName: z.string(),
  partitionId: z.string(),
});

export type PartitionContext = z.infer<typeof partitionContextSchema>;

const triggerMetadataBaseSchema = z.object({
  partitionContext: partitionContextSchema,
});

export const triggerMetadataOneSchema = z.object({
  ...triggerMetadataBaseSchema.shape,
  enqueuedTimeUtc: z.iso.datetime({ local: true }),
  offset: z.int(),
  partitionKey: z.string(),
  sequenceNumber: z.int(),
  properties: z.record(z.string(), z.any()),
  systemProperties: z.record(z.string(), z.any()),
});
export type TriggerMetadataOne = z.infer<typeof triggerMetadataOneSchema>;

export const triggerMetadataManySchema = z.object({
  ...triggerMetadataBaseSchema.shape,
  enqueuedTimeUtcArray: z.iso.datetime({ local: true }).array(),
  offsetArray: z.int().array(),
  partitionKeyArray: z.string().array(),
  sequenceNumberArray: z.int().array(),
  propertiesArray: z.record(z.string(), z.any()).array(),
  systemPropertiesArray: z.record(z.string(), z.any()).array(),
});
export type TriggerMetadataMany = z.infer<typeof triggerMetadataManySchema>;
