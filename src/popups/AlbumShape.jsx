import PointSphere from './PointSphere';
import Blob from '../objects/Blob';
import ImageCard from '../objects/ImageCard';
import PixelBall from '../objects/PixelBall';
import Bars from '../objects/Bars';

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
    case 'bars':
        return (
            <Bars
            size={o.size} grid={o.grid} color={o.color} seed={o.id}
            {...(view === 'album' ? { tilt: Math.PI / 2, spin: false } : {})}
            />
        );
    case 'points':
    default:
      return <PointSphere size={o.size} />;
  }
}