import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.xihengchen.motivo',
  appName: 'Motivo',
  webDir: 'public',
  server: {
    url: 'https://motivo-swart.vercel.app/',
    cleartext: false,
  },
}

export default config