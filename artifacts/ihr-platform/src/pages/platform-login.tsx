import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  identifier: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export default function PlatformLogin() {
  const [, setLocation] = useLocation();
  const { login: setAuthContext } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const loginMutation = useLogin();

  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          if (data.user.role !== "super_admin") {
            toast({
              variant: "destructive",
              title: "Access Denied",
              description: "This portal is restricted to iHR platform administrators only.",
            });
            return;
          }
          setAuthContext(data.token, data.user);
          toast({ title: "Welcome, Platform Admin", description: "Signed in successfully." });
          setLocation("/admin");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Sign In Failed",
            description: error?.message || "Invalid credentials.",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black text-xl text-white shadow-lg shadow-primary/30">
            i
          </div>
          <div>
            <div className="text-white font-bold text-xl tracking-tight">iHR Platform</div>
            <div className="text-xs text-white/40 tracking-wider uppercase">Administration Console</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg">Secure Admin Access</h1>
              <p className="text-white/40 text-xs">Authorized iHR platform personnel only</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70 text-sm">Admin Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="admin@ihr.com"
                        className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-primary/60 focus:bg-white/8 h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70 text-sm">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-primary/60 h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold mt-2 shadow-lg shadow-primary/20"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
                  : "Sign In to Admin Console"}
              </Button>
            </form>
          </Form>

          {/* Quick access */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-3">
              Quick access — test account
            </p>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 transition-colors"
              onClick={() => {
                form.setValue("identifier", "superadmin@ihr.com");
                form.setValue("password", "Demo@1234");
                form.handleSubmit(onSubmit)();
              }}
            >
              <div className="text-left">
                <div className="text-white/80 text-xs font-medium">iHR Platform Admin</div>
                <div className="text-white/35 text-[11px] font-mono mt-0.5">superadmin@ihr.com</div>
              </div>
              <ShieldCheck className="h-4 w-4 text-primary/60 shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-white/25 text-xs">
            Not an admin?{" "}
            <Link href="/login" className="text-primary/70 hover:text-primary transition-colors font-medium">
              Go to regular login
            </Link>
          </p>
          <p className="text-white/15 text-[10px] mt-3 uppercase tracking-widest">
            iHR Platform · All access monitored
          </p>
        </div>
      </div>
    </div>
  );
}
