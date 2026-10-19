import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, PresentationControls, Stage, useGLTF } from '@react-three/drei';

function Model(props) {
  const { scene } = useGLTF('/bitcoin.glb');
  return <primitive object={scene} {...props} />;
}

function ModelFallback() {
  return <Html center><span className="model-fallback">Loading 3D model…</span></Html>;
}

export default function OurModel() {
  return (
    <div className="model-stage" aria-label="Interactive 3D Bitcoin model">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 45 }}>
        <color attach="background" args={['#0b1220']} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 5, 4]} intensity={2} />
        <Suspense fallback={<ModelFallback />}>
          <PresentationControls speed={1.2} global zoom={0.8} polar={[-0.3, 0.3]}>
            <Stage environment={null} intensity={0.7}>
              <Model scale={0.01} />
            </Stage>
          </PresentationControls>
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload('/bitcoin.glb');
