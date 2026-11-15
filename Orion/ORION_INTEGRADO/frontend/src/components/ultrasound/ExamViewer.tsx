import { useEffect, useRef } from 'react';
import type { LocalExam } from '../../types/ultrasound';
import { findRegion } from '../anatomy/BodyMap';
import './ExamViewer.css';

type ExamViewerProps = {
  exam: LocalExam;
  onClose: () => void;
  onRemove: (id: string) => void;
  onGoToRegion: (region: LocalExam['region']) => void;
};

/** Original-image viewer: no AI segmentation or clinical analysis is performed. */
export default function ExamViewer({ exam, onClose, onRemove, onGoToRegion }: ExamViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="exam-viewer"
      aria-labelledby="exam-viewer-title"
      onClose={onClose}
      onClick={event => { if (event.target === dialogRef.current) onClose(); }}
    >
      <div className="exam-viewer__content">
        <header className="exam-viewer__header">
          <div>
            <span className="exam-viewer__eyebrow">ORION / DEMO IMAGE</span>
            <h2 id="exam-viewer-title">{findRegion(exam.region).name}</h2>
          </div>
          <button type="button" className="exam-viewer__close" onClick={onClose} aria-label="Close viewer">×</button>
        </header>
        <div className="exam-viewer__grid">
          <div className="exam-viewer__image-wrap">
            <img src={exam.imageUrl} alt={`Original image from file ${exam.fileName}`} />
            <p>Original image · no AI segmentation has been performed.</p>
          </div>
          <aside className="exam-viewer__info">
            <span className="exam-viewer__status">LOCAL IMPORT · NOT ANALYZED</span>
            <dl>
              <div><dt>Anatomical region</dt><dd>{findRegion(exam.region).name}</dd></div>
              <div><dt>Muscle / structure</dt><dd>{exam.muscle || 'Not specified'}</dd></div>
              <div><dt>File</dt><dd className="exam-viewer__filename">{exam.fileName}</dd></div>
              <div><dt>Added this session</dt><dd>{exam.date}</dd></div>
            </dl>
            <p className="exam-viewer__note">This viewer organizes authorized research images only. It does not perform medical interpretation, diagnosis, muscle measurement, or server storage.</p>
            <div className="exam-viewer__actions">
              <button type="button" className="exam-viewer__primary" onClick={() => onGoToRegion(exam.region)}>View in body atlas</button>
              <button type="button" className="exam-viewer__danger" onClick={() => onRemove(exam.id)}>Remove local record</button>
            </div>
          </aside>
        </div>
      </div>
    </dialog>
  );
}
