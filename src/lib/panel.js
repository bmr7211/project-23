// PopupShell.css의 .popup-panel 크기와 반드시 같게 유지
export const panelRect = () => {
  const w = Math.min(1100, innerWidth * 0.92); // 너비: 최대 1100px, 화면 너비의 92%
  const h = Math.min(720, innerHeight * 0.86); // 높이: 최대 720px, 화면 높이의 86%
  return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h };
};