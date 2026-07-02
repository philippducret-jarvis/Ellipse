import { useCallback, useRef } from 'react';
import type { GameProjectSnapshot } from '@ellipse/shared';
import { fetchSessions, generateViaWebSocket, saveProjectGdl, uploadPhoto, fetchGameProject } from '../../api/client.js';
import { useStudioStore } from '../../store/studio-store.js';
import { AgentTimelinePanel } from './generate/AgentTimelinePanel.js';
import { GeneratePreviewPanel } from './generate/GeneratePreviewPanel.js';
import { GeneratePromptPanel } from './generate/GeneratePromptPanel.js';
import { SessionResultPanel } from './generate/SessionResultPanel.js';

export function GenerateTab({ projectId, snap, onUpdate }: {
  projectId: string;
  snap: GameProjectSnapshot | null;
  onUpdate: (s: GameProjectSnapshot) => void;
}) {
  const prompt = useStudioStore((state) => state.generatePrompt);
  const setPrompt = useStudioStore((state) => state.setGeneratePrompt);
  const uploads = useStudioStore((state) => state.generateUploads);
  const addUpload = useStudioStore((state) => state.addGenerateUpload);
  const removeUpload = useStudioStore((state) => state.removeGenerateUpload);
  const generating = useStudioStore((state) => state.generating);
  const error = useStudioStore((state) => state.generateError);
  const status = useStudioStore((state) => state.generateStatus);
  const plan = useStudioStore((state) => state.generatePlan);
  const agentSteps = useStudioStore((state) => state.generateAgentSteps);
  const gdl = useStudioStore((state) => state.generateGdl);
  const sessionId = useStudioStore((state) => state.generateSessionId);
  const sessionStatus = useStudioStore((state) => state.generateSessionStatus);

  const setGenerating = useStudioStore((state) => state.setGenerating);
  const setError = useStudioStore((state) => state.setGenerateError);
  const setStatus = useStudioStore((state) => state.setGenerateStatus);
  const setPlan = useStudioStore((state) => state.setGeneratePlan);
  const initSteps = useStudioStore((state) => state.initAgentSteps);
  const markRunning = useStudioStore((state) => state.markAgentRunning);
  const updateStep = useStudioStore((state) => state.updateAgentStep);
  const setSession = useStudioStore((state) => state.setGenerateSession);
  const setSessions = useStudioStore((state) => state.setSessions);
  const reset = useStudioStore((state) => state.resetGeneration);
  const wsCloseRef = useRef<(() => void) | null>(null);

  const imagePaths = uploads.map((upload) => upload.url);
  const canGenerate = Boolean(prompt.trim() || snap?.project.source_prompt);
  const gdlPath = snap
    ? `05_runtime/gdl/${snap.project.slug.split('-')[0] ?? 'game'}.preview.gdl.json`
    : '05_runtime/gdl/echoes.preview.gdl.json';

  const handleSaveGdlToProject = useCallback(async () => {
    if (!gdl || !snap) return;
    setError(null);
    setStatus('Enregistrement du GDL dans le projet…');
    try {
      await saveProjectGdl(projectId, gdl, gdlPath);
      const refreshed = await fetchGameProject(projectId);
      onUpdate(refreshed);
      setStatus('GDL enregistré — ouvrez Build ou la preview workspace.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec enregistrement GDL');
      setStatus(null);
    }
  }, [gdl, gdlPath, onUpdate, projectId, setError, setStatus, snap]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const result = await uploadPhoto(file);
      addUpload(result);
    } catch {
      setError("Échec de l'envoi de l'image");
    }
  };

  const stopGeneration = () => {
    wsCloseRef.current?.();
    reset();
  };

  const handleGenerate = useCallback(() => {
    const effectivePrompt = prompt.trim() || snap?.project.source_prompt || '';
    if (!effectivePrompt) return;

    wsCloseRef.current?.();
    reset();
    setGenerating(true);
    setError(null);
    setStatus('Connexion au pipeline Ellipse…');

    wsCloseRef.current = generateViaWebSocket(effectivePrompt, imagePaths, {
      onStatus: setStatus,
      onPlan: (nextPlan) => {
        setPlan(nextPlan);
        initSteps(nextPlan);
      },
      onTaskStart: (task) => markRunning(task.agent, task.task_id),
      onTaskComplete: updateStep,
      onComplete: (session) => {
        setSession(session);
        setStatus(null);
        setGenerating(false);
        void fetchSessions().then(setSessions).catch(() => {});
        void saveProjectGdl(projectId, session.gdl, gdlPath)
          .then(() => fetchGameProject(projectId))
          .then(onUpdate)
          .catch(() => {
            setError('Génération OK mais échec enregistrement GDL — utilisez « Enregistrer dans le projet ».');
          });
      },
      onError: (message) => {
        setError(message);
        setGenerating(false);
        setStatus(null);
      },
    });
  }, [gdlPath, imagePaths, initSteps, markRunning, onUpdate, projectId, prompt, reset, setError, setGenerating, setPlan, setSession, setSessions, setStatus, snap, updateStep]);

  return (
    <div className="tab-content generate-tab">
      <div className="generate-layout">
        <div className="generate-left">
          <GeneratePromptPanel
            snap={snap}
            prompt={prompt}
            uploads={uploads}
            generating={generating}
            status={status}
            error={error}
            canGenerate={canGenerate}
            plan={plan}
            onPromptChange={setPrompt}
            onUploadChange={(file) => void handleUpload(file)}
            onRemoveUpload={removeUpload}
            onGenerate={handleGenerate}
            onStop={stopGeneration}
          />
          <AgentTimelinePanel steps={agentSteps} />
          <SessionResultPanel sessionId={sessionId} sessionStatus={sessionStatus} />
        </div>

        <div className="generate-right">
          <GeneratePreviewPanel hasGdl={Boolean(gdl)} onSaveToProject={gdl && snap ? handleSaveGdlToProject : undefined} />
        </div>
      </div>
    </div>
  );
}
