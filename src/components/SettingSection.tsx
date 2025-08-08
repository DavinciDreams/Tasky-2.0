import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SettingSectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
}

export const SettingSection: React.FC<SettingSectionProps> = ({ title, icon, children }) => {
  return (
    <Card className="mb-6 bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-elegant rounded-2xl">
      <CardHeader className="pb-3 pt-5 px-5 border-b border-border/30">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-3 text-card-foreground">
          {icon && (
            <div className="flex items-center justify-center w-8 h-8">
              <span className="text-lg">{icon}</span>
            </div>
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-3 sm:px-5 py-3">
        {children}
      </CardContent>
    </Card>
  );
};