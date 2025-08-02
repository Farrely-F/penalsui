import { useState } from "react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { motion } from "motion/react";
import { Trophy, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Homepage() {
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handlePlayNow = () => {
    if (currentAccount) {
      navigate("/app");
    }
  };

  const features = [
    {
      icon: <Trophy className="h-6 w-6" />,
      title: "Competitive Gameplay",
      description: "Challenge players worldwide in intense penalty shootouts",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Multiplayer Matches",
      description: "Real-time matches with players from around the globe",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Blockchain Powered",
      description: "Secure, transparent gaming on the Sui blockchain",
    },
  ];

  const stats = [
    { label: "Active Players", value: "10K+" },
    { label: "Games Played", value: "50K+" },
    { label: "Total Rewards", value: "1M+ SUI" },
  ];

  return (
    <div className="min-h-screen flex flex-col backdrop-blur-sm w-full">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            {/* Main Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-4"
            >
              {/* <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-medium">
                <Star className="h-4 w-4 mr-2" />
                Powered by Sui Blockchain
              </Badge> */}
              <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-b from-cyan-600 via-blue-600 to-gray-200 bg-clip-text text-transparent leading-tight">
                PenalSUI
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                The ultimate blockchain-powered penalty shootout game. Challenge
                players worldwide and prove your skills on the pitch.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              {currentAccount ? (
                <Button
                  size="lg"
                  className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg text-white hover:shadow-sm shadow-white/10"
                  onClick={handlePlayNow}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <motion.div
                    animate={{ scale: isHovered ? 1.25 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    ⚽
                  </motion.div>
                  Play Now
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ scale: isHovered ? 1.05 : 1, opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  onMouseOver={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="space-y-4"
                >
                  <ConnectButton className="px-8 py-6 text-lg font-semibold" />
                  {/* <p className="text-sm text-muted-foreground">
                    Connect your wallet to start playing
                  </p> */}
                </motion.div>
              )}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground mt-2">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Choose PenalSUI?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of gaming with our innovative
              blockchain-powered platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2 hover:border-primary/20">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-r backdrop-blur-[4px] from-cyan-600/10 to-gray-200/10 border-2 border-primary/5">
              <CardContent className="text-center py-16 px-8">
                <h3 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Score?
                </h3>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of players in the most exciting penalty
                  shootout experience on the blockchain.
                </p>
                {currentAccount ? (
                  <Button
                    size="lg"
                    className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg text-white hover:shadow-sm shadow-white/10"
                    onClick={handlePlayNow}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    <motion.div
                      animate={{ scale: isHovered ? 1.25 : 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      ⚽
                    </motion.div>
                    Play Now
                  </Button>
                ) : (
                  <ConnectButton className="px-8 py-6 text-lg font-semibold" />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
