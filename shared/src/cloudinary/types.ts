/**
 * CloudinaryConfig is defined here so it can be used by all cloudinary helpers
 * without depending on the deploy/ package.
 */
export interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
}
