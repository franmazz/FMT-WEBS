import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rocket, 
  Layout, 
  Globe, 
  ShoppingBag, 
  Check, 
  Instagram, 
  MessageSquare, 
  MapPin, 
  Menu, 
  X, 
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Image as ImageIcon,
  Lock,
  Loader2,
  Smartphone,
  Zap,
  ShieldCheck,
  Users
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { cn, formatCurrency } from './lib/utils';

// --- Types ---
interface SiteContent {
  id: string;
  heroTitle: string;
  heroSubtitle: string;
  heroStats: {
    delivery: string;
    price: string;
    satisfaction: string;
  };
  aboutText: string;
  adminPassword?: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  timeBadge: string;
  iconName: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  delivery: string;
  mpLink: string;
  isFeatured: boolean;
}

interface PortfolioItem {
  id: string;
  name: string;
  description: string;
  link: string;
  badge: string;
  emoji: string;
  imageUrl?: string;
  order: number;
}

// --- Defaults ---
const DEFAULT_CONTENT: SiteContent = {
  id: 'main',
  heroTitle: "Tu negocio merece estar en internet",
  heroSubtitle: "Diseño web que vende, que enamora, que representa. En FMT Webs transformamos tu visión en una experiencia digital de alto impacto.",
  heroStats: {
    delivery: "1—3 días para una landing",
    price: "desde $100k",
    satisfaction: "100% satisfacción"
  },
  aboutText: "Somos Francisco y Melina, fundadores de FMT Webs. Nuestra misión es democratizar el acceso a la web de alta calidad para emprendedores y empresas argentinas. Creemos en el diseño como herramienta de venta y en la velocidad como ventaja competitiva.",
  adminPassword: 'fmt2025'
};

const DEFAULT_SERVICES: Service[] = [
  { id: '1', name: 'Landing Page', description: 'Página de aterrizaje optimizada para conversiones. Ideal para lanzamientos o promociones.', timeBadge: '1 a 3 días hábiles', iconName: 'Rocket' },
  { id: '2', name: 'Web Corporativa', description: 'Sitio web profesional con múltiples secciones para presentar tu empresa y servicios.', timeBadge: '5 a 7 días hábiles', iconName: 'Globe' },
  { id: '3', name: 'Tienda Online', description: 'E-commerce completo con carrito de compras y pasarela de pagos. ¡Vende 24/7!', timeBadge: '7 a 10 días hábiles', iconName: 'ShoppingBag' }
];

const DEFAULT_PLANS: Plan[] = [
  { id: '1', name: 'Plan Básico', price: 100000, delivery: '1 a 3 días hábiles', mpLink: 'https://mpago.la/1JTAw7U', isFeatured: false, features: ['Landing page profesional', 'Diseño atractivo y moderno', 'Formulario de contacto', 'Sin tienda online', 'Sin actualizaciones incluidas'] },
  { id: '2', name: 'Plan Profesional', price: 200000, delivery: '5 a 7 días hábiles', mpLink: 'https://mpago.la/1RC3fSe', isFeatured: true, features: ['Hasta 5 páginas', 'Diseño personalizado', 'Formulario de contacto', 'Tienda online hasta 25 productos', '1 actualización incluida'] },
  { id: '3', name: 'Plan Premium', price: 350000, delivery: '7 a 10 días hábiles', mpLink: 'https://mpago.la/1RgFn94', isFeatured: false, features: ['Hasta 10 páginas', 'Diseño personalizado', 'Formulario de contacto', 'Tienda online hasta 50 productos', '2 actualizaciones incluidas'] }
];

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  { id: '1', name: 'URBN', description: 'Tienda online de ropa streetwear con catálogo completo y carrito de compras.', link: 'https://urbn14.mitiendanube.com', badge: 'Tienda Online', emoji: '👕', order: 1 },
  { id: '2', name: 'Bolsos & Co', description: 'Tienda online de marroquinería con catálogo de productos y pasarela de pagos.', link: 'https://bolsosco2.mitiendanube.com', badge: 'Tienda Online', emoji: '👜', order: 2 },
  { id: '3', name: 'Tu próximo proyecto', description: 'Tu negocio puede ser el próximo. Escribinos y arrancamos.', link: '#contacto', badge: '¿El tuyo?', emoji: '🚀', order: 3 }
];

// --- Main App ---
export default function App() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(DEFAULT_PORTFOLIO);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Firestore Subscriptions
  useEffect(() => {
    const unsubContent = onSnapshot(doc(db, 'config', 'site'), (doc) => {
      if (doc.exists()) setContent({ ...DEFAULT_CONTENT, ...doc.data(), id: doc.id } as SiteContent);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'config/site'));
    
    const unsubServices = onSnapshot(query(collection(db, 'services'), orderBy('name')), (snapshot) => {
      if (!snapshot.empty) setServices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Service)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'services'));

    const unsubPlans = onSnapshot(query(collection(db, 'plans'), orderBy('price')), (snapshot) => {
      if (!snapshot.empty) setPlans(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Plan)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'plans'));

    const unsubPortfolio = onSnapshot(query(collection(db, 'portfolio'), orderBy('order')), (snapshot) => {
      if (!snapshot.empty) setPortfolio(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PortfolioItem)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'portfolio'));

    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    // Auth check from localStorage
    const savedAuth = localStorage.getItem('fmt_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      signInAnonymously(auth).catch(() => {
        setIsAuthenticated(false);
        localStorage.removeItem('fmt_admin_auth');
      });
    }

    return () => {
      unsubContent();
      unsubServices();
      unsubPlans();
      unsubPortfolio();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogoDoubleClick = async () => {
    if (isAuthenticated) {
      setIsAdminOpen(true);
    } else {
      const pass = prompt('Ingrese contraseña de administrador:');
      if (pass === content.adminPassword) {
        try {
          await signInAnonymously(auth);
          setIsAuthenticated(true);
          localStorage.setItem('fmt_admin_auth', 'true');
          setIsAdminOpen(true);
        } catch (err: any) {
          console.error('Auth Error Full:', err);
          let msg = 'Error de autenticación: ' + (err.message || 'Desconocido');
          
          if (err.code === 'auth/operation-not-allowed') {
            msg = 'ERROR: Debes habilitar "Anonymous Sign-in" en la consola de Firebase (Authentication > Sign-in method). Presiona el switch "Enable" y guarda los cambios.';
          } else if (err.code === 'auth/unauthorized-domain') {
            msg = 'ERROR: Este dominio no está autorizado. Debes ir a Firebase Console > Authentication > Settings > Authorized Domains y agregar este dominio: ' + window.location.hostname;
          }
          
          alert(msg);
        }
      } else if (pass !== null) {
        alert('Contraseña incorrecta');
      }
    }
  };

  return (
    <div className="min-h-screen selection:bg-electric-blue selection:text-white">
      <Navbar 
        isScrolled={isScrolled} 
        onLogoDoubleClick={handleLogoDoubleClick} 
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} 
      />
      
      <AnimatePresence>
        {mobileMenuOpen && (
          <MobileMenu onClose={() => setMobileMenuOpen(false)} />
        )}
      </AnimatePresence>

      <main>
        <Hero content={content} />
        <Services services={services} />
        <Pricing plans={plans} onSelectPlan={setSelectedPlan} />
        <Portfolio portfolio={portfolio} />
        <About aboutText={content.aboutText} />
        <Contact plans={plans} />
      </main>

      <Footer />

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {isAdminOpen && (
          <AdminPanel 
            onClose={() => setIsAdminOpen(false)} 
            content={content}
            services={services}
            plans={plans}
            portfolio={portfolio}
            onLogout={() => {
              setIsAuthenticated(false);
              localStorage.removeItem('fmt_admin_auth');
              setIsAdminOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <PaymentModal 
            plan={selectedPlan} 
            onClose={() => setSelectedPlan(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Subcomponents ---

function Navbar({ isScrolled, onLogoDoubleClick, onMenuToggle }: any) {
  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
      isScrolled ? "glass-nav py-3" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onDoubleClick={onLogoDoubleClick}
          title="Doble clic para admin"
        >
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-electric-blue rotate-45 rounded-sm opacity-80 group-hover:rotate-[135deg] transition-transform duration-500"></div>
            <div className="absolute inset-0 bg-cyan-glow -rotate-45 rounded-sm opacity-80 group-hover:-rotate-[225deg] transition-transform duration-500 scale-75"></div>
            <span className="relative text-[10px] font-display font-bold text-white">FMT</span>
          </div>
          <span className="font-display text-xl font-bold tracking-tighter">
            FMT <span className="text-cyan-glow">Webs</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <a href="#servicios" className="hover:text-electric-blue transition-colors">Servicios</a>
          <a href="#planes" className="hover:text-electric-blue transition-colors">Planes</a>
          <a href="#portfolio" className="hover:text-electric-blue transition-colors">Portfolio</a>
          <a href="#nosotros" className="hover:text-electric-blue transition-colors">Nosotros</a>
          <a 
            href="#contacto" 
            className="bg-electric-blue hover:bg-electric-blue/90 text-white px-6 py-2 rounded-full transition-all hover:scale-105 active:scale-95"
          >
            Contacto
          </a>
        </div>

        <button className="md:hidden text-white" onClick={onMenuToggle}>
          <Menu />
        </button>
      </div>
    </nav>
  );
}

function MobileMenu({ onClose }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="fixed inset-0 z-[60] bg-dark-bg p-8 flex flex-col items-center justify-center gap-8"
    >
      <button className="absolute top-6 right-6" onClick={onClose}>
        <X size={32} />
      </button>
      <a href="#servicios" onClick={onClose} className="text-2xl font-display font-bold">Servicios</a>
      <a href="#planes" onClick={onClose} className="text-2xl font-display font-bold">Planes</a>
      <a href="#portfolio" onClick={onClose} className="text-2xl font-display font-bold">Portfolio</a>
      <a href="#nosotros" onClick={onClose} className="text-2xl font-display font-bold">Nosotros</a>
      <a href="#contacto" onClick={onClose} className="text-2xl font-display font-bold text-electric-blue">Contacto</a>
    </motion.div>
  );
}

function Hero({ content }: { content: SiteContent }) {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden min-h-[90vh] flex items-center">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 dots-bg"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-electric-blue/10 blur-[120px] rounded-full -translate-y-1/2"></div>
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            DISPONIBLES AHORA
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight">
            {content.heroTitle.split(' ').slice(0, -2).join(' ')} <br/>
            <span className="text-gradient">{content.heroTitle.split(' ').slice(-2).join(' ')}</span>
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl mb-10 max-w-xl leading-relaxed">
            {content.heroSubtitle}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <a 
              href="#planes" 
              className="px-8 py-4 bg-white text-dark-bg hover:bg-slate-200 rounded-xl font-bold flex items-center gap-2 group transition-all hover:-translate-y-1"
            >
              Ver planes
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="#contacto" 
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold backdrop-blur-sm transition-all"
            >
              Hablemos
            </a>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/5">
            <div>
              <div className="text-2xl font-display font-bold text-cyan-glow">{content.heroStats.delivery.split(' ')[0]}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Días entrega</div>
            </div>
            <div>
              <div className="text-2xl font-display font-bold text-cyan-glow">{content.heroStats.price.split(' ')[1]}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Desde</div>
            </div>
            <div>
              <div className="text-2xl font-display font-bold text-cyan-glow">100%</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Satisfacción</div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-electric-blue to-cyan-glow rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-dark-bg border border-white/5 p-8 rounded-3xl overflow-hidden aspect-square flex flex-col items-center justify-center text-center">
              <div className="grid grid-cols-2 gap-4 w-full h-full opacity-40">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-6">
                    <div className="w-full h-4 bg-white/10 rounded gap-2 flex flex-col justify-center">
                      <div className="w-3/4 h-1 bg-white/20 rounded"></div>
                      <div className="w-1/2 h-1 bg-white/20 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <div className="w-20 h-20 bg-electric-blue rounded-full flex items-center justify-center shadow-2xl shadow-electric-blue/50 animate-pulse">
                    <Rocket className="text-white" size={40} />
                 </div>
                 <div className="mt-6 font-display font-bold text-2xl">Digital Impact</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Services({ services }: { services: Service[] }) {
  return (
    <section id="servicios" className="py-24 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 tracking-tight">Servicios <span className="text-cyan-glow">Express</span></h2>
          <p className="text-slate-500 max-w-2xl mx-auto uppercase tracking-[0.2em] text-[10px] font-bold">Webs optimizadas para resultados inmediatos</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {services.map((service, idx) => {
            const IconComp = service.iconName === 'Rocket' ? Rocket : service.iconName === 'Globe' ? Globe : ShoppingBag;
            return (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group p-8 frosted-card frosted-card-hover flex flex-col h-full"
              >
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/5 group-hover:bg-electric-blue transition-all duration-300">
                  <IconComp size={24} className="text-electric-blue group-hover:text-white transition-colors" />
                </div>
                
                <h3 className="font-display text-xl font-bold mb-3">{service.name}</h3>
                <p className="text-slate-400 text-sm mb-8 flex-grow leading-relaxed">{service.description}</p>
                
                <div className="mt-auto px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Entrega</span>
                  <span className="text-xs font-bold text-cyan-glow uppercase tracking-wider">{service.timeBadge}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Pricing({ plans, onSelectPlan }: { plans: Plan[], onSelectPlan: (p: Plan) => void }) {
  return (
    <section id="planes" className="py-24 px-6 bg-white/[0.01]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 tracking-tight">Planes <span className="text-cyan-glow">Insuperables</span></h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm">Transparencia total. Sin costos ocultos.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "group relative p-8 frosted-card flex flex-col overflow-hidden",
                plan.isFeatured 
                  ? "bg-electric-blue/10 border-electric-blue/50 ring-1 ring-electric-blue/20 scale-105 z-10" 
                  : ""
              )}
            >
              {plan.isFeatured && (
                <div className="absolute top-0 right-0">
                   <div className="bg-electric-blue text-white text-[8px] font-black uppercase tracking-widest px-8 py-1 rotate-45 translate-x-4 translate-y-3">
                    TOP
                  </div>
                </div>
              )}
              
              <div className="mb-8">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mb-2 block",
                  plan.isFeatured ? "text-blue-300" : "text-slate-500"
                )}>
                  {plan.name.split(' ')[1]}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-display font-black">{formatCurrency(plan.price)}</span>
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest ml-1">ARS</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((feature, fidx) => (
                  <li key={fidx} className="flex gap-3 text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                    <Check size={16} className={cn("shrink-0 mt-0.5", plan.isFeatured ? "text-cyan-glow" : "text-slate-600")} />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <div className="text-[10px] text-cyan-glow font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Zap size={10} /> Entrega {plan.delivery}
                </div>
                <button 
                  onClick={async () => {
                    try {
                      await addDoc(collection(db, 'pedidos'), {
                        planId: plan.id,
                        planName: plan.name,
                        amount: plan.price,
                        createdAt: serverTimestamp()
                      });
                    } catch (e) {
                      handleFirestoreError(e, OperationType.CREATE, 'pedidos');
                    }
                    onSelectPlan(plan);
                  }}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    plan.isFeatured 
                      ? "bg-electric-blue hover:bg-blue-600 text-white shadow-xl shadow-electric-blue/20" 
                      : "bg-white/10 hover:bg-white/20 text-white"
                  )}
                >
                  Contratar plan
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="mt-12 text-center text-slate-500 text-[10px] font-medium uppercase tracking-[0.2em] italic">
          * Dominio y hosting no incluido. Consulta planes a medida.
        </p>
      </div>
    </section>
  );
}

function Portfolio({ portfolio }: { portfolio: PortfolioItem[] }) {
  return (
    <section id="portfolio" className="py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 tracking-tight">Portfolio</h2>
            <p className="text-slate-400 max-w-xl text-sm">Nuestro trabajo habla por nosotros.</p>
          </div>
          <a href="#contacto" className="text-cyan-glow text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
            Ver todo ↗
          </a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolio.map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group frosted-card flex flex-col h-full overflow-hidden"
            >
              <div className="aspect-[16/10] relative bg-slate-900 overflow-hidden">
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-slate-800 to-slate-900 group-hover:scale-110 transition-transform duration-500">
                    {item.emoji}
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[8px] font-black text-white border border-white/10 uppercase tracking-widest">
                    {item.badge}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-display text-lg font-bold mb-2">{item.name}</h3>
                <p className="text-slate-500 text-xs mb-6 line-clamp-2">{item.description}</p>
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-electric-blue hover:text-cyan-glow transition-colors"
                >
                  Ver sitio live
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function About({ aboutText }: { aboutText: string }) {
  return (
    <section id="nosotros" className="py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-electric-blue/20 rounded-full blur-[80px]"></div>
            <div className="relative">
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-electric-blue to-cyan-glow flex items-center justify-center text-4xl md:text-6xl font-display font-black text-white shadow-2xl shadow-electric-blue/30 border-4 border-white/10">
                F&M
              </div>
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-4 -right-4 bg-dark-bg border border-electric-blue/30 px-4 py-2 rounded-full flex items-center gap-2"
              >
                <span className="block w-2 h-2 rounded-full bg-cyan-glow"></span>
                <span className="text-[10px] font-bold text-gray-300">Thiago nos inspira</span>
              </motion.div>
            </div>
          </motion.div>

          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 tracking-tight">Sobre <span className="text-cyan-glow">Nosotros</span></h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-12">
              {aboutText}
            </p>

            <div className="grid grid-cols-2 gap-6">
              {[
                { title: 'Rapidez', icon: Zap },
                { title: 'Accesibilidad', icon: Smartphone },
                { title: 'Calidad', icon: ShieldCheck },
                { title: 'Cercanía', icon: Users }
              ].map((val, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-electric-blue group-hover:text-white transition-all">
                    <val.icon size={20} />
                  </div>
                  <span className="font-bold text-sm text-gray-300 uppercase tracking-widest">{val.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Contact({ plans }: { plans: Plan[] }) {
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    negocio: '',
    planInteres: '',
    mensaje: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const path = 'consultas';
    try {
      await addDoc(collection(db, path), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setSuccess(true);
      setFormData({ nombre: '', contacto: '', negocio: '', planInteres: '', mensaje: '' });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contacto" className="py-24 px-6 relative">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 tracking-tight">Hablemos de <span className="text-cyan-glow">Tu Web</span></h2>
            <p className="text-gray-400 mb-12 max-w-md">Envianos tus datos y nos ponemos en contacto hoy mismo para arrancar tu proyecto.</p>

            <div className="space-y-8">
              <a href="https://wa.me/5493417808971" target="_blank" className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-green-500/20 group-hover:text-green-500 transition-all">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">WhatsApp</div>
                  <div className="text-lg font-bold group-hover:text-green-500 transition-colors">+54 9 341 780-8971</div>
                </div>
              </a>
              <a href="https://instagram.com/fmt.webs" target="_blank" className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-pink-500/20 group-hover:text-pink-500 transition-all">
                  <Instagram size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Instagram</div>
                  <div className="text-lg font-bold group-hover:text-pink-500 transition-colors">@fmt.webs</div>
                </div>
              </a>
              <div className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-electric-blue/20 group-hover:text-electric-blue transition-all">
                  <MapPin size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Ubicación</div>
                  <div className="text-lg font-bold">Rosario, Santa Fe, Argentina</div>
                </div>
              </div>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/[0.03] border border-white/5 p-8 md:p-10 rounded-[40px]"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-2">Tu nombre</label>
                  <input 
                    required
                    type="text" 
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 focus:border-electric-blue outline-none transition-all"
                    placeholder="Ej: Francisco..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-2">WhatsApp / Email</label>
                  <input 
                    required
                    type="text" 
                    value={formData.contacto}
                    onChange={e => setFormData({ ...formData, contacto: e.target.value })}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 focus:border-electric-blue outline-none transition-all"
                    placeholder="Ej: +54 9..."
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-2">Tu negocio</label>
                  <input 
                    type="text" 
                    value={formData.negocio}
                    onChange={e => setFormData({ ...formData, negocio: e.target.value })}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 focus:border-electric-blue outline-none transition-all"
                    placeholder="Ej: Marca de ropa..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-2">Plan de interés</label>
                  <select 
                    required
                    value={formData.planInteres}
                    onChange={e => setFormData({ ...formData, planInteres: e.target.value })}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 focus:border-electric-blue outline-none transition-all appearance-none"
                  >
                    <option value="" disabled className="bg-dark-bg">Seleccionar plan</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.name} className="bg-dark-bg">{p.name}</option>
                    ))}
                    <option value="A medida" className="bg-dark-bg text-electric-blue">Plan a medida ✨</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-2">Mensaje (opcional)</label>
                <textarea 
                  value={formData.mensaje}
                  onChange={e => setFormData({ ...formData, mensaje: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 focus:border-electric-blue outline-none transition-all min-h-[120px]"
                  placeholder="Contanos un poco más..."
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className={cn(
                  "w-full py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3",
                  success ? "bg-green-500 text-white" : "bg-electric-blue hover:bg-blue-600 text-white"
                )}
              >
                {loading ? <Loader2 className="animate-spin" /> : success ? <Check /> : 'Enviar consulta'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="z-20 w-full mt-12 mb-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 px-8 py-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-electric-blue to-cyan-glow flex items-center justify-center font-display font-black text-sm text-white shadow-lg shadow-electric-blue/30">
            F&M
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold font-display uppercase tracking-widest">Francisco & Melina</span>
            <span className="text-[10px] text-slate-400 font-medium">Thiago nos inspira ❤️</span>
          </div>
        </div>
        
        <div className="hidden lg:flex gap-8 text-[9px] uppercase tracking-[0.3em] font-black text-slate-500">
          <span>Rápidos</span>
          <span>·</span>
          <span>Económicos</span>
          <span>·</span>
          <span>Dedicación</span>
        </div>

        <div className="text-center md:text-right">
          <span className="text-[10px] text-slate-500 block uppercase tracking-widest font-bold mb-1">Rosario, Argentina</span>
          <span className="text-xs font-bold text-slate-400">© 2025 FMT Webs</span>
        </div>
      </div>
    </footer>
  );
}

// --- Payment Modal Component ---
function PaymentModal({ plan, onClose }: { plan: Plan, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-dark-bg border border-white/10 p-8 rounded-[32px] max-w-md w-full shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button className="absolute top-4 right-4 text-gray-500 hover:text-white" onClick={onClose}>
          <X size={24} />
        </button>

        <h2 className="text-2xl font-display font-black mb-6">Resumen del pedido</h2>
        
        <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Plan seleccionado</span>
            <span className="font-display font-bold text-electric-blue">{plan.name}</span>
          </div>
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Inversión total</span>
            <span className="text-2xl font-display font-black">{formatCurrency(plan.price)}</span>
          </div>
          
          <div className="pt-6 border-t border-white/10 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 italic">Anticipo (50%)</span>
              <span className="font-bold text-cyan-glow">{formatCurrency(plan.price / 2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 italic">Al entregar (50%)</span>
              <span className="font-bold text-gray-300">{formatCurrency(plan.price / 2)}</span>
            </div>
          </div>
        </div>

        <a 
          href={plan.mpLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 bg-[#009EE3] hover:bg-[#0089C7] text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all"
        >
          Pagar anticipo con Mercado Pago
        </a>
        
        <p className="mt-6 text-[10px] text-gray-600 text-center uppercase tracking-widest">
          Transacción segura vía Mercado Pago
        </p>
      </motion.div>
    </motion.div>
  );
}

// --- Admin Panel Component ---
function AdminPanel({ onClose, content, services, plans, portfolio, onLogout }: any) {
  const [activeTab, setActiveTab] = useState('inicio');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // States for forms
  const [editContent, setEditContent] = useState(content);
  const [editServices, setEditServices] = useState(services);
  const [editPlans, setEditPlans] = useState(plans);
  const [editPortfolio, setEditPortfolio] = useState(portfolio);

  const handleSaveContent = async () => {
    setLoading(true);
    const path = 'config/site';
    try {
      await setDoc(doc(db, 'config', 'site'), editContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (collectionName: string, item: any) => {
    setLoading(true);
    try {
      const { id, ...data } = item;
      await setDoc(doc(db, collectionName, id), data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, collectionName);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (collectionName: string, newItem: any) => {
    setLoading(true);
    try {
      await addDoc(collection(db, collectionName), newItem);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, collectionName);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (collectionName: string, id: string) => {
    if (!confirm('¿Estás seguro de eliminar este item?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, collectionName, id));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, collectionName);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, itemId: string) => {
    const storageRef = ref(storage, `portfolio/${itemId}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-dark-bg flex flex-col"
    >
      <div className="glass-nav py-4 px-8 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Lock className="text-electric-blue" size={20} />
            <h2 className="font-display font-bold text-xl uppercase tracking-widest">Panel Admin</h2>
          </div>
          <div className="flex gap-1">
            {['Inicio', 'Servicios', 'Planes', 'Portfolio', 'Contraseña'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
                  activeTab === tab.toLowerCase() ? "bg-electric-blue text-white" : "text-gray-500 hover:bg-white/5"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {saveSuccess && <span className="text-green-500 text-xs font-bold">✓ Cambios guardados</span>}
          <button onClick={onLogout} className="text-gray-500 hover:text-red-500 text-xs font-bold uppercase tracking-widest">Salir</button>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={20} /></button>
        </div>
      </div>

      <div className="flex-grow overflow-auto p-8 md:p-12">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {activeTab === 'inicio' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <SectionTitle title="Contenido Hero" />
              <div className="grid gap-6">
                <AdminField label="Título principal" value={editContent.heroTitle} onChange={v => setEditContent({ ...editContent, heroTitle: v })} />
                <AdminField label="Subtítulo descriptivo" textarea value={editContent.heroSubtitle} onChange={v => setEditContent({ ...editContent, heroSubtitle: v })} />
                <div className="grid grid-cols-3 gap-6">
                  <AdminField label="Stats: Velocidad" value={editContent.heroStats.delivery} onChange={v => setEditContent({ ...editContent, heroStats: { ...editContent.heroStats, delivery: v } })} />
                  <AdminField label="Stats: Precio" value={editContent.heroStats.price} onChange={v => setEditContent({ ...editContent, heroStats: { ...editContent.heroStats, price: v } })} />
                  <AdminField label="Stats: Satisfacción" value={editContent.heroStats.satisfaction} onChange={v => setEditContent({ ...editContent, heroStats: { ...editContent.heroStats, satisfaction: v } })} />
                </div>
              </div>
              <SectionTitle title="Sobre Nosotros" />
              <AdminField label="Texto historia" textarea value={editContent.aboutText} onChange={v => setEditContent({ ...editContent, aboutText: v })} />
              <button 
                onClick={handleSaveContent} 
                className="bg-electric-blue px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all w-full"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Guardar Cambios Generales
              </button>
            </div>
          )}

          {activeTab === 'servicios' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
               {editServices.map((service: any) => (
                 <div key={service.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl grid gap-4">
                   <div className="flex items-center justify-between">
                     <span className="font-bold text-electric-blue">{service.name}</span>
                     <button onClick={() => handleUpdateItem('services', service)} className="text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:text-white">
                       {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Guardar
                     </button>
                   </div>
                   <div className="grid md:grid-cols-2 gap-4">
                    <AdminField label="Nombre" value={service.name} onChange={v => setEditServices(editServices.map((s:any) => s.id === service.id ? { ...s, name: v } : s))} />
                    <AdminField label="Badge Tiempo" value={service.timeBadge} onChange={v => setEditServices(editServices.map((s:any) => s.id === service.id ? { ...s, timeBadge: v } : s))} />
                   </div>
                   <AdminField label="Descripción" textarea value={service.description} onChange={v => setEditServices(editServices.map((s:any) => s.id === service.id ? { ...s, description: v } : s))} />
                 </div>
               ))}
             </div>
          )}

          {activeTab === 'planes' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              {editPlans.map((plan: any) => (
                <div key={plan.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl grid gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-electric-blue">{plan.name}</span>
                    <button onClick={() => handleUpdateItem('plans', plan)} className="text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:text-white">
                      {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Guardar
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                   <AdminField label="Nombre" value={plan.name} onChange={v => setEditPlans(editPlans.map((p:any) => p.id === plan.id ? { ...p, name: v } : p))} />
                   <AdminField label="Precio" value={String(plan.price)} onChange={v => setEditPlans(editPlans.map((p:any) => p.id === plan.id ? { ...p, price: Number(v) } : p))} />
                   <AdminField label="Entrega" value={plan.delivery} onChange={v => setEditPlans(editPlans.map((p:any) => p.id === plan.id ? { ...p, delivery: v } : p))} />
                   <AdminField label="Link Mercado Pago" value={plan.mpLink} onChange={v => setEditPlans(editPlans.map((p:any) => p.id === plan.id ? { ...p, mpLink: v } : p))} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <button 
                onClick={() => handleAddItem('portfolio', { name: 'Nuevo Proyecto', description: 'Descripción...', link: '#', badge: 'Tipo', emoji: '🚀', order: editPortfolio.length + 1 })}
                className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-gray-500 hover:border-electric-blue hover:text-electric-blue transition-all"
              >
                <Plus /> Agregar proyecto al portfolio
              </button>
              
              {editPortfolio.map((item: any) => (
                <div key={item.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl grid gap-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-48 aspect-video bg-white/5 rounded-xl flex flex-col items-center justify-center gap-2 border border-white/10 overflow-hidden relative group">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">{item.emoji}</span>
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all">
                        <ImageIcon size={24} className="mb-1" />
                        <span className="text-[10px] font-bold uppercase">Cambiar foto</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={async e => {
                            if (e.target.files?.[0]) {
                              const url = await handleImageUpload(e.target.files[0], item.id);
                              const updated = { ...item, imageUrl: url };
                              handleUpdateItem('portfolio', updated);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex-grow grid gap-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <AdminField label="Nombre" value={item.name} onChange={v => setEditPortfolio(editPortfolio.map((i:any) => i.id === item.id ? { ...i, name: v } : i))} />
                        <AdminField label="Badge / Categoría" value={item.badge} onChange={v => setEditPortfolio(editPortfolio.map((i:any) => i.id === item.id ? { ...i, badge: v } : i))} />
                      </div>
                      <AdminField label="Descripción" value={item.description} onChange={v => setEditPortfolio(editPortfolio.map((i:any) => i.id === item.id ? { ...i, description: v } : i))} />
                      <div className="grid md:grid-cols-3 gap-4">
                        <AdminField label="Link" value={item.link} onChange={v => setEditPortfolio(editPortfolio.map((i:any) => i.id === item.id ? { ...i, link: v } : i))} />
                        <AdminField label="Emoji (si no hay foto)" value={item.emoji} onChange={v => setEditPortfolio(editPortfolio.map((i:any) => i.id === item.id ? { ...i, emoji: v } : i))} />
                        <AdminField label="Orden" value={String(item.order)} onChange={v => setEditPortfolio(editPortfolio.map((i:any) => i.id === item.id ? { ...i, order: Number(v) } : i))} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => handleDeleteItem('portfolio', item.id)}
                      className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                    <button 
                      onClick={() => handleUpdateItem('portfolio', item)}
                      className="bg-electric-blue text-white text-xs font-bold uppercase tracking-widest px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600"
                    >
                      {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Guardar Proyecto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'contraseña' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <SectionTitle title="Seguridad del Panel" />
              <AdminField label="Nueva contraseña de acceso" value={editContent.adminPassword} onChange={v => setEditContent({ ...editContent, adminPassword: v })} />
              <p className="text-xs text-gray-500 italic">Si la cambia, deberá usar la nueva la próxima vez que intente acceder.</p>
              <button 
                onClick={handleSaveContent} 
                className="bg-electric-blue px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all w-full"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Actualizar Contraseña
              </button>
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500 border-l-2 border-electric-blue pl-4 mb-6">
      {title}
    </h3>
  );
}

function AdminField({ label, value, onChange, textarea = false }: { label: string, value: string, onChange: (v: string) => void, textarea?: boolean }) {
  return (
    <div className="w-full">
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
      {textarea ? (
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)}
          className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-electric-blue transition-all min-h-[100px] text-sm"
        />
      ) : (
        <input 
          type="text" 
          value={value} 
          onChange={e => onChange(e.target.value)}
          className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-electric-blue transition-all text-sm"
        />
      )}
    </div>
  );
}
