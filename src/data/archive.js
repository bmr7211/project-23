export const PAGES = Array.from({ length: 10 }, (_, i) =>
  `https://picsum.photos/seed/archive${i}/840/1188`
);

// // Archive 잡지 페이지 (순서대로, 짝수 개)
// // 0번 = 앞표지, 마지막 = 뒤표지
// // 이미지는 public/archive/ 폴더에 넣기
// export const PAGES = [
//   '/archive/p00.jpg', // 앞표지
//   '/archive/p01.jpg',
//   '/archive/p02.jpg',
//   '/archive/p03.jpg',
//   '/archive/p04.jpg',
//   '/archive/p05.jpg',
//   '/archive/p06.jpg',
//   '/archive/p07.jpg',
//   '/archive/p08.jpg',
//   '/archive/p09.jpg', // 뒤표지
// ];