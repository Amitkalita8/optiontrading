import { useEffect, useRef } from 'react';
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
// "Get started" opens sign-up and continues to the dashboard once signed in.
function LandingPage() {
  const navigate = useNavigate();
  const { user, openAuth } = useAuth();
  const pendingLogin = useRef(false);

  useEffect(() => {
    if (user && pendingLogin.current) {
      pendingLogin.current = false;
      navigate('/onboarding');
    }
  }, [user, navigate]);

  const start = () => {
    // Show campaign screen then watchlist
    navigate('/onboarding');
  };

  const login = () => {
    if (user) {
      navigate('/onboarding');
    } else {
      pendingLogin.current = true;
      openAuth('login');
    }
  };

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
