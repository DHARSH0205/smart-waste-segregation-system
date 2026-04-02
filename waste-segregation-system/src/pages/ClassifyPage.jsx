import { useNavigate } from "react-router-dom";
import "./ClassifyPage.css";

function ClassifyPage() {
  const navigate = useNavigate();
  const options = [
    {
      title: "Single Image Classification",
      description: "Upload one image and get instant waste category prediction.",
      path: "/classify/single",
      image: "https://placehold.co/600x340/e8f5e9/2e7d32?text=Single+Image+Mode",
    },
    {
      title: "Camera Classification",
      description: "Use your camera to capture waste and classify in real time.",
      path: "/classify/camera",
      image: "https://placehold.co/600x340/e3f2fd/1565c0?text=Camera+Mode",
    },
    {
      title: "Bulk ZIP Classification",
      description: "Upload a ZIP with many images and download sorted results.",
      path: "/classify/bulk",
      image: "https://placehold.co/600x340/f1f8e9/558b2f?text=Bulk+ZIP+Mode",
    },
  ];

  return (
    <div className="classify-page">
      <section className="classify-hub">
        <div className="page-topbar">
          <button className="mode-back-btn" type="button" onClick={() => navigate("/")}>
            Back
          </button>
          <button className="ghost-cta" type="button" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </div>

        <h1>Choose Classification Mode</h1>
        <p>Pick one workflow to continue with waste classification.</p>

        <div className="classify-options-grid">
          {options.map((option) => (
            <article
              key={option.path}
              className="classify-option-card"
              onClick={() => navigate(option.path)}
            >
              <img src={option.image} alt={option.title} className="classify-option-image" />
              <h3>{option.title}</h3>
              <p>{option.description}</p>
              <button type="button" className="predict-btn">
                Open
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

}

export default ClassifyPage;
