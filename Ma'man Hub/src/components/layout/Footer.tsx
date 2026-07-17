import { Link } from "react-router-dom";
import {
  GraduationCap,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
} from "lucide-react";

const footerLinks = {
  platform: [
    { name: "Categories", href: "/categories" },
    { name: "Specialists", href: "/specialists" },
    { name: "Instructors", href: "/instructors" },
    { name: "Leaderboard", href: "/leaderboard" },
    { name: "Feeds", href: "/feeds" },

  ],
  resources: [
    { name: "Blog", href: "/blog" },
    { name: "Help Center", href: "/help" },
    { name: "Community", href: "/community" },
    { name: "Career", href: "/career" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook", color: "text-blue-500" },
  { icon: Twitter, href: "#", label: "Twitter", color: "text-sky-400" },
  { icon: Instagram, href: "#", label: "Instagram", color: "text-pink-500" },
  { icon: Youtube, href: "#", label: "YouTube", color: "text-red-600" },
];

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-display font-bold text-xl">
                Ma'<span className="text-indigo-400">Man</span>
              </span>
            </Link>
            <p className="text-gray-300 mb-6 max-w-sm">
              Empowering minds through knowledge. Join millions of learners on
              their journey to excellence.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <social.icon className={`w-5 h-5 ${social.color}`} />
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
