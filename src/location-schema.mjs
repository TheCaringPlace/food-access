import { z } from "zod";

export const locationTypeSchema = z.enum(["Pantry", "Pop-up", "Shelter", "Soup kitchen", "Other"]);

const locationDetailsSchema = z.object({
  name: z.string().trim().min(1),
  type: locationTypeSchema,
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  days_open: z.string(),
  times_open: z.string(),
});

const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);

export const sourceLocationSchema = locationDetailsSchema
  .extend({
    latitude: latitudeSchema,
    longitude: longitudeSchema,
  })
  .strict();

export const kmlLocationSchema = locationDetailsSchema
  .extend({
    weeks_open: z.string(),
    query: z.string(),
    point: z.tuple([latitudeSchema, longitudeSchema]).nullable(),
  })
  .strict();

const censusSchema = z.object({
  matched_address: z.string(),
  tiger_line: z.record(z.string(), z.unknown()),
  address_components: z.record(z.string(), z.unknown()),
});

export const publishedLocationSchema = sourceLocationSchema
  .extend({
    weeks_open: z.string(),
    coordinate_source: z.string(),
    coordinate_precision: z.string(),
    census: censusSchema.nullable(),
  })
  .strict();

export const publishedLocationsSchema = z.array(publishedLocationSchema).min(1);
