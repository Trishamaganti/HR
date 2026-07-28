import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  identifier: z.string().min(1, "Email or Employee ID is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuthContext } = useAuth();
  const { toast } = useToast();

  // Read redirect param from the URL (e.g. /login?redirect=/jobs/5)
  const redirectTo = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("redirect")
    : null;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const loginMutation = useLogin();

  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setAuthContext(data.token, data.user);

          // If there's a redirect param, always honour it regardless of role.
          if (redirectTo) {
            setLocation(redirectTo);
            return;
          }
          const role = data.user.role;
          if (role === "super_admin") {
            setLocation("/admin");
          } else if (role === "employee") {
            setLocation("/employee/dashboard");
          } else if (["owner", "admin", "hr", "manager"].includes(role)) {
            setLocation("/hr/dashboard");
          } else {
            setLocation("/candidate/dashboard");
          }
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: error?.message || "Invalid credentials. Please try again.",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-center bg-muted/40 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="relative z-10 max-w-lg mx-auto w-full">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl tracking-tight text-primary mb-12">
            <div className="w-10 h-10 rounded bg-primary text-primary-foreground flex items-center justify-center font-black text-xl">
              i
            </div>
            iHR Platform
          </Link>
          <h2 className="text-4xl font-bold tracking-tight mb-6">The modern standard for HR teams.</h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Manage your entire workforce from one centralized, intelligent dashboard. No more spreadsheets.
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-center p-6 md:p-12 relative">
        <Link href="/" className="absolute top-6 left-6 lg:hidden">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email or Employee ID</FormLabel>
                    <FormControl>
                      <Input placeholder="name@company.com or EMP-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link href="#" className="text-sm font-medium text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-base" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sign In"}
              </Button>
            </form>
          </Form>
          
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
