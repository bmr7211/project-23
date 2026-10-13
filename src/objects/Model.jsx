import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations, Center } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';

// 움직이는 3D 모델(glb): 긴 쪽 길이 = size
export default function Model({ url, size = 2, color }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);

  const model = useMemo(() => {
    const m = clone(scene); // 같은 모델을 여러 번 써도 따로 움직이게 복사
    // color를 주면 모든 면을 그 색 재질로 덮어씌움
    if (color) {
      m.traverse((o) => {
        if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
      });
    }
    return m;
  }, [scene, color]);

  const { actions, names } = useAnimations(animations, group);

  // 모델마다 원래 크기가 제각각이라 긴 쪽을 size에 맞춤
  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const s = box.getSize(new THREE.Vector3());
    return size / Math.max(s.x, s.y, s.z);
  }, [model, size]);

  // 모델에 들어 있는 첫 번째 애니메이션 재생
  useEffect(() => {
    const action = actions[names[0]];
    if (!action) return;
    action.reset().play();
    action.time = Math.random() * action.getClip().duration;
    return () => action.stop();
  }, [actions, names]);

  return (
    <group ref={group} scale={scale}>
      <Center>
        <primitive object={model} />
      </Center>
    </group>
  );
}