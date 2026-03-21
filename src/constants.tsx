import React from 'react';
import { 
  Activity, 
  Brain, 
  Wind, 
  Stethoscope,
  AlertCircle,
  Eye,
  Calculator,
  FileText,
  Folder,
  ClipboardList
} from 'lucide-react';

export const GCS_OPTIONS = {
  eye: [
    { value: 4, label: 'Spontaneous', sub: 'Eyes open naturally' },
    { value: 3, label: 'To Speech', sub: 'Open when asked' },
    { value: 2, label: 'To Pain', sub: 'Open to pressure' },
    { value: 1, label: 'None', sub: 'No response' },
  ],
  verbal: [
    { value: 5, label: 'Oriented', sub: 'Knows name, place, date' },
    { value: 4, label: 'Confused', sub: 'Disoriented conversation' },
    { value: 3, label: 'Inappropriate', sub: 'Random words' },
    { value: 2, label: 'Incomprehensible', sub: 'Moaning/sounds' },
    { value: 1, label: 'None', sub: 'No verbalization' },
  ],
  motor: [
    { value: 6, label: 'Obeys Commands', sub: 'Moves as requested' },
    { value: 5, label: 'Localizes Pain', sub: 'Finds pain source' },
    { value: 4, label: 'Withdraws (Pain)', sub: 'Pulling away' },
    { value: 3, label: 'Flexion (Abnormal)', sub: 'Decorticate posturing' },
    { value: 2, label: 'Extension (Abnormal)', sub: 'Decerebrate posturing' },
    { value: 1, label: 'None', sub: 'Flaccid' },
  ]
};

export const BOTTOM_NAV_SECTIONS = [
  { id: 'calculators', name: 'Scoring', icon: <FileText size={24} className="text-blue-500" /> },
  { id: 'exam', name: 'Exam', icon: <Folder size={24} className="text-yellow-500" /> },
  { id: 'diagnostics', name: 'Diagnostics', icon: <Activity size={24} className="text-red-500" /> },
  { id: 'tasks', name: 'Tasks', icon: <ClipboardList size={24} className="text-green-500" /> },
  { id: 'summary', name: 'AI Consult', icon: <Brain size={24} className="text-purple-500" /> },
];


export const PULSE_GRADES = [
  { value: 3, label: '3+ Bounding', sub: 'Stronger than normal' },
  { value: 2, label: '2+ Normal', sub: 'Expected strength' },
  { value: 1, label: '1+ Weak/Thready', sub: 'Diminished' },
  { value: 0, label: '0 Absent', sub: 'No palpable pulse' },
];

export const MUSCLE_STRENGTH_GRADES = [
  { value: 5, label: '5 Normal', sub: 'Active motion against full resistance' },
  { value: 4, label: '4 Good', sub: 'Active motion against some resistance' },
  { value: 3, label: '3 Fair', sub: 'Active motion against gravity' },
  { value: 2, label: '2 Poor', sub: 'Active motion with gravity eliminated' },
  { value: 1, label: '1 Trace', sub: 'Muscle contraction, no motion' },
  { value: 0, label: '0 Zero', sub: 'No contraction' },
];
