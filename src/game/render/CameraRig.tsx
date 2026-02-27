import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export function CameraRig() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, 22);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
}
