import { X } from "lucide-react";

interface ModalProps {
  children: React.ReactNode;
  title: string;
  show: boolean;
  onClose: () => void;
}

export default function Modal({ children, title, show, onClose }: ModalProps) {

  const handleClose = () => {
    onClose();
  };

  return (
    <>
    {show && (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
      <div className="bg-white p-4  w-full max-w-md flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{title}</h1>
          <button onClick={handleClose}>
            <X className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
    )}
    </>
  );
}