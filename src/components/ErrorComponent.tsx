// ErrorComponent.tsx
import React from 'react';
import { Alert, AlertTitle } from '@mui/material';

interface ErrorComponentProps {
  title?: string;
  message: string;
}

export const ErrorComponent: React.FC<ErrorComponentProps> = ({ title, message }) => {
  return (
    <Alert severity="error">
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
    </Alert>
  );
};
