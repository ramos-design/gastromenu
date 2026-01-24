"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function NastaveniPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nastavení</h1>
        <p className="text-muted-foreground">
          Spravujte nastavení vaší aplikace a integrací.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Vzhled</CardTitle>
            <CardDescription>
              Přizpůsobte si vzhled aplikace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="theme" className="text-base">
                Barevné schéma
              </Label>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Integrace</CardTitle>
            <CardDescription>
              Propojte aplikaci s externími službami (v prototypu neaktivní).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL pro web</Label>
              <Input id="webhook-url" placeholder="https://vas-web.cz/api/menu-update" disabled />
            </div>
            <div className="space-y-2">
                <Label htmlFor="api-key">API Klíč</Label>
                <Input id="api-key" placeholder="••••••••••••••••••••" type="password" disabled />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
