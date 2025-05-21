import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY, forceZ, forceRadial } from 'd3-force-3d';


function Node({ position, id, topic, summary, onClick, index, onHover, onUnhover }) {
  const meshRef = useRef();
  
  return (
    <group position={position}>
      <Instance
        ref={meshRef}
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); onHover(id, position, topic); }}
        onPointerOut={() => { onUnhover(); }}
        userData={{ id, index }}
      />
    </group>
  );
}

function Connection({ start, end }) {
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  midPoint.z += 3;

  const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
  const points = curve.getPoints(30);

  return (
    <line>
      <bufferGeometry attach="geometry" setFromPoints={points} />
      <lineBasicMaterial 
        attach="material" 
        color="#00ffff" 
        opacity={0.3} 
        transparent 
      />
    </line>
  );
}

function Scene({ data, onNodeClick }) {
  const { scene, camera } = useThree();
  const nodes = useRef({});
  const [positions, setPositions] = useState([]);
  const moveSpeed = 2;
  const [hoveredNode, setHoveredNode] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const handleNodeHover = (id, position, topic) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNode({ id, position, topic });
      document.body.style.cursor = 'pointer';
    }, 100); // Increased debounce time in ms
  };

  const handleNodeUnhover = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNode(null);
      document.body.style.cursor = 'default';
    }, 100); // Increased debounce time in ms
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.key) {
        case 'ArrowUp':
          camera.position.y += moveSpeed;
          break;
        case 'ArrowDown':
          camera.position.y -= moveSpeed;
          break;
        case 'ArrowLeft':
          camera.position.x -= moveSpeed;
          break;
        case 'ArrowRight':
          camera.position.x += moveSpeed;
          break;
        case 'PageUp':
          camera.position.z -= moveSpeed;
          break;
        case 'PageDown':
          camera.position.z += moveSpeed;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera]);

  // Force-directed layout calculation
  useEffect(() => {
    if (!data.length) return;

    // Calculate radius as 40% of the screen width
    const screenWidth = window.innerWidth;
    const radius = screenWidth * 0.4 / 20; // scale down for 3D units

    // Fibonacci sphere distribution
    data.forEach((node, i) => {
      const phi = Math.acos(1 - 2 * (i + 0.5) / data.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      node.x = radius * Math.cos(theta) * Math.sin(phi);
      node.y = radius * Math.sin(theta) * Math.sin(phi);
      node.z = radius * Math.cos(phi);
    });

    setPositions(data.map(node => [node.x, node.y, node.z]));
    data.forEach((node) => {
      nodes.current[node.id] = new THREE.Vector3(node.x, node.y, node.z);
    });
  }, [data]);

  useEffect(() => {
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(ambientLight, directionalLight);

    return () => {
      scene.remove(ambientLight, directionalLight);
    };
  }, [scene]);

  // Memoize geometry and material for better performance
  const geometry = useMemo(() => new THREE.SphereGeometry(0.4, 16, 16), []);
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#cccccc",
    metalness: 0.9,
    roughness: 0.05,
    envMapIntensity: 1
  }), []);

  return (
    <>
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.8}
        zoomSpeed={1.2}
        panSpeed={0.8}
        minDistance={30}
        maxDistance={200}
        enableKeys={false}
      />
      <Instances limit={data.length} geometry={geometry} material={material}>
        {positions.map((position, index) => (
          <Node
            key={data[index].id}
            id={data[index].id}
            position={position}
            topic={data[index].topic}
            summary={data[index].summary}
            onClick={() => onNodeClick(data[index])}
            index={index}
            onHover={handleNodeHover}
            onUnhover={handleNodeUnhover}
          />
        ))}
      </Instances>
      {hoveredNode && (
        <Text
          position={[hoveredNode.position[0], hoveredNode.position[1] + 1, hoveredNode.position[2]]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="black"
        >
          {hoveredNode.topic}
        </Text>
      )}
      {data.map((msg) =>
        msg.links.map((linkId) => {
          const start = nodes.current[msg.id];
          const end = nodes.current[linkId];
          if (start && end) {
            return <Connection key={`${msg.id}-${linkId}`} start={start} end={end} />;
          }
          return null;
        })
      )}
      <Text
        position={[0, 0, -100]}
        fontSize={20}
        color="#222"
        anchorX="center"
        anchorY="middle"
        depthTest={false}
      >
        GPT VISUALIZER
      </Text>
    </>
  );
}

function Notification({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '5px',
        maxWidth: '300px',
        zIndex: 1000,
      }}
    >
      <h3 style={{ margin: '0 0 10px 0' }}>{message.topic}</h3>
      <p style={{ margin: 0 }}>{message.summary}</p>
    </div>
  );
}

export default function ChatVisualizer() {
  const [data, setData] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetch('/full_chat_history.json')
      .then((response) => response.json())
      .then((jsonData) => {
        // Reduce nodes by 30 percent
        const originalLength = jsonData.length;
        const reducedLength = Math.floor(originalLength * 0.7);
        const reducedNodes = jsonData.slice(0, reducedLength);

        // Filter links to only connect existing nodes
        const keptNodeIds = new Set(reducedNodes.map(node => node.id));
        reducedNodes.forEach(node => {
          if (node.links) {
            node.links = node.links.filter(linkId => keptNodeIds.has(linkId));
          }
        });

        setData(reducedNodes);
      })
      .catch((error) => console.error('Error loading chat history:', error));
  }, []);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f0f0f0' }}>
      <Canvas
        camera={{ position: [0, 0, 80], fov: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <Scene data={data} onNodeClick={handleNodeClick} />
      </Canvas>
      {selectedNode && (
        <Notification
          message={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
} 