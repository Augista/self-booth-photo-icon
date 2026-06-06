// NEXT_PUBLIC_CAMERA_MODE controls the camera source:
//   "test"       → browser webcam (no DigiCamControl needed)
//   "production" → DigiCamControl via localhost:5513 (default)
export const CAMERA_MODE =
  (process.env.NEXT_PUBLIC_CAMERA_MODE ?? 'production') as 'test' | 'production'

export const IS_TEST_MODE = CAMERA_MODE === 'test'
