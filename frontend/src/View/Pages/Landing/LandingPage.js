import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Components/UserAuthentication/AuthContext/AuthContext';
import LandingNav from '../../Components/Landing/LandingNav/LandingNav';
import Hero from '../../Components/Landing/Hero/Hero';
import OptionSellingExplainer from '../../Components/Landing/OptionSellingExplainer/OptionSellingExplainer';
import WorkflowSteps from '../../Components/Landing/WorkflowSteps/WorkflowSteps';
import ProductPillars from '../../Components/Landing/ProductPillars/ProductPillars';
import CampaignInputs from '../../Components/Landing/CampaignInputs/CampaignInputs';
import DecisionSupport from '../../Components/Landing/DecisionSupport/DecisionSupport';
import CtaBand from '../../Components/Landing/CtaBand/CtaBand';
import LandingFooter from '../../Components/Landing/LandingFooter/LandingFooter';
import '../../Components/Common/Button/Button.css';
import './LandingPage.css';

// Public landing page (route "/"), outside the app layout.
// "Get started" opens sign-up (then trading mode → onboarding); "Log in" opens sign-in.
function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Signed-in users go straight to the app; others to the auth pages.
  const start = () => navigate(user ? '/dashboard' : '/signup');
  const login = () => navigate(user ? '/dashboard' : '/signin');

  const signedIn = Boolean(user);

  return (
    <div className="landing">
      <LandingNav signedIn={signedIn} onLogin={login} onStart={start} />
      <main>
        <Hero signedIn={signedIn} onStart={start} onLogin={login} />
        <OptionSellingExplainer />
        <WorkflowSteps />
        <ProductPillars />
        <CampaignInputs />
        <DecisionSupport />
        <CtaBand signedIn={signedIn} onStart={start} />
      </main>
      <LandingFooter />
    </div>
  );
}

export default LandingPage;
