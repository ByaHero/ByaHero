declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.css' {
  const content: { [key: string]: string };
  export default content;
}

declare module '@react-native-community/netinfo' {
  const NetInfo: any;
  export default NetInfo;
  export const useNetInfo: any;
  export const fetch: any;
  export const addEventListener: any;
}

declare module 'expo-camera' {
  export const Camera: any;
  export const CameraView: any;
  export const useCameraPermissions: any;
}
