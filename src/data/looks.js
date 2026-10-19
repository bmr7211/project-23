// Lookbook 사진: public/looks/ 안에 이름 규칙대로 넣기
// lookN-thumb.jpg (그리드) / lookN-1 ~ lookN-4.jpg (상세)
const EXT = 'jpg';
const photo = (name) => `/looks/${name}.${EXT}`;

export const looks = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  thumb: photo(`look0${i + 1}`),
  photos: Array.from({ length: 4 }, (_, j) => photo(`look0${i + 1}_0${j + 1}`)),
}));