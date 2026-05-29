'use client';

import { Modal } from './Modal';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  const pieces = [
    {
      name: 'Tướng (General)',
      char: { red: '帥', black: '將' },
      description: 'Di chuyển 1 ô theo chiều ngang hoặc dọc trong phạm vi cung. Hai Tướng không được đối mặt trực tiếp nếu không có quân nào ở giữa.',
      moves: '↑ ↓ ← →'
    },
    {
      name: 'Sĩ (Advisor)',
      char: { red: '仕', black: '士' },
      description: 'Di chuyển 1 ô theo đường chéo trong phạm vi cung.',
      moves: '↗ ↖ ↘ ↙'
    },
    {
      name: 'Tượng (Elephant)',
      char: { red: '相', black: '象' },
      description: 'Di chuyển 2 ô theo đường chéo. Không được qua sông (không thể đến phía đối phương). Ô ở giữa phải trống.',
      moves: '⤡ (2 ô chéo)'
    },
    {
      name: 'Xe (Chariot)',
      char: { red: '車', black: '車' },
      description: 'Di chuyển bao nhiêu ô tùy ý theo chiều ngang hoặc dọc. Không được nhảy qua quân khác.',
      moves: '↑ ↓ ← → (nhiều ô)'
    },
    {
      name: 'Mã (Horse)',
      char: { red: '馬', black: '馬' },
      description: 'Di chuyển 1 ô ngang hoặc dọc, rồi 1 ô chéo. Ô "chân" phải trống.',
      moves: '┐ ┌ ┘ └ + chéo'
    },
    {
      name: 'Pháo (Cannon)',
      char: { red: '炮', black: '炮' },
      description: 'Di chuyển bao nhiêu ô tùy ý theo ngang hoặc dọc. Khi ăn quân, phải có đúng 1 quân cản giữa.',
      moves: '↑ ↓ ← → (nhiều ô)'
    },
    {
      name: 'Tốt (Soldier)',
      char: { red: '兵', black: '卒' },
      description: 'Đi 1 ô tiến về phía trước. Khi đã qua sông, có thể đi ngang.',
      moves: '↑ (trước sông) hoặc ↑←→ (sau sông)'
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Luật Cờ Tướng" size="lg">
      <div className="max-h-[70vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 gap-4">
          {pieces.map((piece, idx) => (
            <div key={idx} className="bg-bg-surface rounded-lg p-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="flex gap-2">
                  <span className="w-10 h-10 rounded-full bg-piece-red-bg text-white flex items-center justify-center font-bold text-lg">
                    {piece.char.red}
                  </span>
                  <span className="w-10 h-10 rounded-full bg-piece-black-bg text-yellow-400 border border-yellow-400 flex items-center justify-center font-bold text-lg">
                    {piece.char.black}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{piece.name}</h3>
                  <p className="text-xs text-text-muted font-mono">{piece.moves}</p>
                </div>
              </div>
              <p className="text-sm text-text-secondary">{piece.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-bg-surface rounded-lg">
          <h4 className="font-semibold mb-2">Cách chơi</h4>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>• Hai người chơi luân phiên di chuyển quân cờ</li>
            <li>• Quân đỏ (phía trên) đi trước</li>
            <li>• Mục tiêu: Chiếu bí (checkmate) Tướng của đối thủ</li>
            <li>• Khi Tướng đang bị chiếu, phải thoát khỏi tình trạng chiếu ngay trong nước đi</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
