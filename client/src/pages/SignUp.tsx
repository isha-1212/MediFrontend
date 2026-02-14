import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Activity, ShieldCheck, User, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { authService } from "@/lib/auth";
import { supabase, API_URL } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const signUpSchema = z.object({
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["user", "admin"]),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export default function SignUp() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);

    const form = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            confirmPassword: "",
            role: "user",
        },
    });

    async function onSubmit(values: z.infer<typeof signUpSchema>) {
        setIsPending(true);
        try {
            // Step 1: Sign up with Supabase (save full name in user metadata)
            const result = await authService.signUp(values.email, values.password, values.role, values.fullName);

            if (result.user) {
                // Step 2: Register in Django to enforce unique email constraint
                const registerResponse = await fetch(`${API_URL}/api/users/users/register/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        supabase_user_id: result.user.id,
                        email: values.email,
                        role: values.role,
                        full_name: values.fullName
                    })
                });

                // Check if user already exists in Django (409 Conflict)
                if (registerResponse.status === 409) {
                    const error = await registerResponse.json();
                    toast({
                        title: "User already exists",
                        description: error.detail || "An account with this email already exists. Redirecting to sign in...",
                        variant: "destructive",
                    });
                    setTimeout(() => setLocation("/login"), 2000);
                    return;
                }

                if (!registerResponse.ok) {
                    const error = await registerResponse.json();
                    throw new Error(error.detail || 'Failed to complete registration');
                }

                // Success - user created in both Supabase and Django
                toast({
                    title: "Account created successfully!",
                    description: "You can now sign in with your credentials.",
                });
                setTimeout(() => setLocation("/login"), 2000);
            }
        } catch (error: any) {
            console.log('Signup error:', error);

            // Check if user already exists
            if (error.name === 'UserExistsError' ||
                error.message?.toLowerCase().includes("already") ||
                error.message?.toLowerCase().includes("exists") ||
                error.code === "user_already_exists" ||
                error.status === 422) {
                toast({
                    title: "User already exists",
                    description: "An account with this email already exists. Redirecting to sign in...",
                    variant: "destructive",
                });
                setTimeout(() => setLocation("/login"), 2000);
            } else {
                toast({
                    title: "Sign up failed",
                    description: error.message || "An error occurred during sign up. Please try again.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 select-none">
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
                <div className="mb-8 text-center select-none">
                    <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
                        <Activity className="w-8 h-8 text-white pointer-events-none" />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white select-none">MediClaim AI</h1>
                    <p className="text-slate-500 mt-2 select-none">Automated Policy & Claim Processing</p>
                </div>

                <Card className="border-slate-200/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <CardHeader className="select-none">
                        <CardTitle className="select-none">Create Your Account</CardTitle>
                        <CardDescription className="select-none">Sign up to access the portal</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="select-none">Select Role</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    className="grid grid-cols-2 gap-4"
                                                >
                                                    <FormItem className="relative">
                                                        <FormControl>
                                                            <RadioGroupItem value="user" id="role-user" className="peer sr-only" />
                                                        </FormControl>
                                                        <Label
                                                            htmlFor="role-user"
                                                            className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-slate-50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all select-none"
                                                            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                                                        >
                                                            <User className="mb-2 h-6 w-6 text-slate-500 peer-data-[state=checked]:text-primary pointer-events-none" />
                                                            <span className="font-semibold pointer-events-none">Policy Holder</span>
                                                        </Label>
                                                    </FormItem>
                                                    <FormItem className="relative">
                                                        <FormControl>
                                                            <RadioGroupItem value="admin" id="role-admin" className="peer sr-only" />
                                                        </FormControl>
                                                        <Label
                                                            htmlFor="role-admin"
                                                            className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-slate-50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all select-none"
                                                            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                                                        >
                                                            <ShieldCheck className="mb-2 h-6 w-6 text-slate-500 peer-data-[state=checked]:text-primary pointer-events-none" />
                                                            <span className="font-semibold pointer-events-none">Admin</span>
                                                        </Label>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="fullName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="select-none">Full Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    placeholder="Enter your full name"
                                                    {...field}
                                                    className="h-11 select-text"
                                                    autoComplete="name"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="select-none">Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="Enter your email"
                                                    {...field}
                                                    className="h-11 select-text"
                                                    autoComplete="email"
                                                />
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
                                            <FormLabel className="select-none">Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="Create a password (min 6 characters)"
                                                    {...field}
                                                    className="h-11 select-text"
                                                    autoComplete="new-password"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="select-none">Confirm Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="Confirm your password"
                                                    {...field}
                                                    className="h-11 select-text"
                                                    autoComplete="new-password"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full h-11 text-base" disabled={isPending}>
                                    {isPending ? "Creating account..." : "Sign Up"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="justify-center border-t p-6 bg-slate-50/50 flex-col space-y-3 select-none">
                        <p className="text-sm text-center text-muted-foreground select-none">
                            Already have an account?{" "}
                            <Button
                                variant="ghost"
                                className="p-0 h-auto font-semibold select-none"
                                onClick={() => setLocation("/login")}
                                type="button"
                            >
                                Sign in
                            </Button>
                        </p>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs select-none"
                            onClick={() => setLocation("/login")}
                            type="button"
                        >
                            <ArrowLeft className="w-3 h-3 mr-1 pointer-events-none" />
                            Back to Sign In
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
