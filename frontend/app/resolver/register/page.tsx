'use client';

import ResolverRegistration from '../../components/ResolverRegistration';

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

import Link from 'next/link';

export default function RegisterResolverPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative">
        {/* Home Button */}
        <div className="absolute -top-2 left-0">
          <Link href="/">
            <Button className="px-6 py-3 bg-[#4285f4] text-white text-lg font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
              Home
            </Button>
          </Link>
        </div>
        {/* Instructions Button */}
        <div className="absolute -top-2 right-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="px-6 py-3 bg-[#4285f4] text-white text-lg font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                How to Run a Resolver Bot
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-[#DCEBFE] border-l-2 border-black">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-3xl font-black text-black mb-4">Running a Resolver Bot</SheetTitle>
                <SheetDescription className="text-xl font-bold text-black">
                  Follow these steps to set up and run your resolver bot
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <ScrollArea className="h-[500px] w-full rounded-base border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                    <CardContent className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-black mb-1">1. Fork the Template</h3>
                      <p className="font-bold text-sm">
                        Fork the resolver bot template from:
                        <a 
                          href="https://github.com/technicalclipper/ResolverX/tree/swap2/resolver-bot-template"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 px-3 py-1.5 bg-[#DCEBFE] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all text-sm"
                        >
                          resolver-bot-template
                        </a>
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-black mb-1">2. Configure Environment</h3>
                      <p className="font-bold text-sm mb-2">Fill in the following environment variables in .env:</p>
                      <div className="bg-[#DCEBFE] border-2 border-black p-3 font-mono text-xs">
                        <p>ETH_PRIVATE_KEY=your_ethereum_private_key</p>
                        <p>TRON_PRIVATE_KEY=your_tron_private_key</p>
                        <p>PORT=3001</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-black mb-1">3. Provide Liquidity</h3>
                      <p className="font-bold text-sm">
                        Ensure your resolver wallet has sufficient liquidity in both chains:
                      </p>
                      <ul className="list-disc list-inside mt-1 space-y-1 font-bold text-sm">
                        <li>ETH on Sepolia Testnet</li>
                        <li>TRX on Nile Testnet</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-black mb-1">4. Host & Deploy</h3>
                      <p className="font-bold text-sm mb-2">
                        Host your bot and make it publicly accessible. Use services like:
                      </p>
                      <ul className="list-disc list-inside space-y-1 font-bold text-sm">
                        <li>Heroku</li>
                        <li>DigitalOcean</li>
                        <li>AWS</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-black mb-1">5. Register Your Bot</h3>
                      <p className="font-bold text-sm">
                        Use your bot's public URL in the registration form to start participating in the resolver marketplace.
                      </p>
                    </div>
                    </CardContent>
                  </Card>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <ResolverRegistration />
      </div>
    </div>
  );
}