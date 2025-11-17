import z from 'zod';

const partitionContextSchema = z.object({
  consumerGroupName: z.string(),
  eventHubPath: z.string(),
});

export type PartitionContext = z.infer<typeof partitionContextSchema>;

const triggerMetadataBaseSchema = z.object({
  partitionContext: partitionContextSchema,
});

export const triggerMetadataOneSchema = z.object({
  ...triggerMetadataBaseSchema.shape,
  enqueuedTimeUtc: z.iso.datetime(),
  offset: z.string(),
  partitionKey: z.string(),
  sequenceNumber: z.number().int(),
  properties: z.record(z.string(), z.any()),
  systemProperties: z.record(z.string(), z.any()),
});
export type TriggerMetadataOne = z.infer<typeof triggerMetadataOneSchema>;

export const triggerMetadataManySchema = z.object({
  ...triggerMetadataBaseSchema.shape,
  enqueuedTimeUtcArray: z.iso.datetime().array(),
  offsetArray: z.string().array(),
  partitionKeyArray: z.string().array(),
  sequenceNumberArray: z.number().int().array(),
  propertiesArray: z.record(z.string(), z.any()).array(),
  systemPropertiesArray: z.record(z.string(), z.any()).array(),
});
export type TriggerMetadataMany = z.infer<typeof triggerMetadataManySchema>;
