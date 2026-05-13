"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AlexaConsentPage() {
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const state = searchParams.get("state") ?? "";
  const clientId = searchParams.get("client_id") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setCheckingAuth(false);
    });
  }, [supabase]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      try {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        setIsLoggedIn(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setLoading(false);
      }
    },
    [supabase, email, password],
  );

  const handleAllow = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/alexa/auth/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, platform: "alexa" }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create link");
      }

      const { authCode } = (await res.json()) as { authCode: string };

      // Redirect back to Alexa with the auth code
      const url = new URL(redirectUri);
      url.searchParams.set("code", authCode);
      url.searchParams.set("state", state);
      window.location.href = url.toString();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }, [clientId, redirectUri, state]);

  const handleDeny = useCallback(() => {
    const url = new URL(redirectUri);
    url.searchParams.set("error", "access_denied");
    url.searchParams.set("state", state);
    window.location.href = url.toString();
  }, [redirectUri, state]);

  if (!redirectUri || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Request</CardTitle>
            <CardDescription>
              This page should only be accessed through the Alexa account linking flow.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isLoggedIn ? "Link Your Account" : "Sign In to Lorgy"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLoggedIn
              ? "Alexa wants to access your Lorgy inventory"
              : "Sign in to link your Lorgy account with Alexa"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!isLoggedIn ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="rounded-md border p-4 space-y-2">
                <p className="text-sm font-medium">Alexa will be able to:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Search your inventory by voice</li>
                  <li>Add, update, and remove items</li>
                  <li>Manage cabinets and shelves</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDeny}
                  disabled={loading}
                >
                  Deny
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAllow}
                  disabled={loading}
                >
                  {loading ? "Linking..." : "Allow"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
