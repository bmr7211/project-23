const temp = (seed) => `https://picsum.photos/seed/${seed}/300/400?grayscale`;

export const looks = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  thumb: temp(`look${i + 1}-thumb`),
  photos: Array.from({ length: 4 }, (_, j) => temp(`look${i + 1}-${j + 1}`)),
}));