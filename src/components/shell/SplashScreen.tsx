import { motion } from 'framer-motion';
import { Disc } from 'lucide-react';

export function SplashScreen() {
    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white"
        >
            <div className="relative flex flex-col items-center gap-6">
                {/* Logo Animation */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                        scale: [0.8, 1.1, 1],
                        opacity: 1,
                        rotate: [0, 360],
                    }}
                    transition={{
                        duration: 1.5,
                        ease: "easeOut",
                        times: [0, 0.6, 1]
                    }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                    <Disc size={64} className="text-white relative z-10" strokeWidth={1.5} />
                </motion.div>

                {/* Text Animation */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="flex flex-col items-center gap-2"
                >
                    <h1 className="text-3xl font-bold tracking-[0.5em] font-mono ml-4">MUSE</h1>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                        className="h-px bg-gradient-to-r from-transparent via-white/50 to-transparent w-full"
                    />
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2, duration: 0.5 }}
                        className="text-[10px] text-white/40 uppercase tracking-widest mt-2"
                    >
                        Audio Visualization Engine
                    </motion.p>
                </motion.div>
            </div>
        </motion.div>
    );
}
