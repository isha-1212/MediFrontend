import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsPending(true);
    try {
      const result = await authService.signIn(values.email, values.password);

      if (result.user) {
        // Get role from Supabase user metadata
        const userRole = result.user.user_metadata?.role || 'user';

        // Store auth data in localStorage for useAuth hook
        localStorage.setItem('mediclaim_auth_user_id', result.user.id);
        localStorage.setItem('mediclaim_auth_role', userRole);
        localStorage.setItem('mediclaim_auth_email', result.user.email || '');

        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });

        // Redirect based on role
        if (userRole === "admin") {
          setLocation("/admin");
        } else {
          setLocation("/portal");
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);

      let errorTitle = "Sign in failed";
      let errorMessage = "Invalid email or password.";

      // Check error type
      if (error.message?.includes("Email not confirmed")) {
        errorTitle = "Email not confirmed";
        errorMessage = "Please check your email and click the confirmation link before signing in.";
      } else if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. If you just signed up, please check your email for a confirmation link.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">MediClaim AI</h1>
          <p className="text-slate-500 mt-2">Automated Policy & Claim Processing</p>
        </div>

        <Card className="border-slate-200/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access the portal</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email" {...field} className="h-11" />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full h-11 text-base" disabled={isPending}>
                  {isPending ? "Logging in..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="justify-center border-t p-6 bg-slate-50/50 flex-col space-y-3">
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{" "}
              <Button
                variant="ghost"
                className="p-0 h-auto font-semibold"
                onClick={() => window.location.href = "/signup"}
              >
                Sign up
              </Button>
            </p>
            <p className="text-xs text-center text-muted-foreground border-t pt-3 w-full">
              Note: This is a demo. Use any email and password.
            </p>
          </CardFooter>
        </Card>
      </motion.div >
    </div >
  );
}
