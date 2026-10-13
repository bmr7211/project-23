import PointSphere from './PointSphere';
import Blob from '../objects/Blob';
import ImageCard from '../objects/ImageCard';
import PixelBall from '../objects/PixelBall';
import Bars from '../objects/Bars';
import Rings from '../objects/Rings';
import Wire from '../objects/Wire';
import Model from '../objects/Model';
import Wave from '../objects/Wave';
import Morph from '../objects/Morph';
import Swarm from '../objects/Swarm';

// type 보고 오브제 모양 고르기 (새 종류는 여기에 case 추가)
export default function AlbumShape({ o, view = 'track' }) {
  switch (o.type) {
    case 'blob':
        return <Blob size={o.size} colors={o.colors} />;
    case 'image':
        if (!o.src) return <PointSphere size={o.size} />;
        return (
            <group rotation={[view === 'album' ? (o.tiltX ?? 0.35) : 0, 0, 0]}>
            <ImageCard size={o.size} src={o.src} />
            </group>
        );
    case 'pixels':
        return <PixelBall size={o.size} grid={o.grid} color={o.color} seed={o.id} />;
    case 'rings':
        return <Rings size={o.size} count={o.count} color={o.color} seed={o.id} />;
    case 'wire':
        return <Wire size={o.size} shape={o.shape} color={o.color} />;
    case 'wave':
        return <Wave size={o.size} rows={o.rows} color={o.color} />;
    case 'morph':
        return <Morph size={o.size} color={o.color} />;
    case 'bars':
        return (
            <Bars
            size={o.size} grid={o.grid} color={o.color} seed={o.id}
            {...(view === 'album' ? { tilt: Math.PI / 2, spin: false } : {})}
            />
        );
    case 'swarm':
        return <Swarm size={o.size} count={o.count} color={o.color} seed={o.id} />;
    case 'points':
    default:
      return <PointSphere size={o.size} />;
  }
}