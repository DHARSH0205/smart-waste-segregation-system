import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

function LandingPage() {
  const navigate = useNavigate();

  const wasteTypes = [
    {
      title: "Paper & Cardboard",
      image: "/waste/paper.jpg",
      description: "Newspapers, cartons, and cardboard materials.",
    },
    {
      title: "Plastics",
      image: "/waste/plastic.jpeg",
      description: "Bottles, wrappers, and plastic containers.",
    },
    {
      title: "Glass",
      image: "/waste/glass.jpg",
      description: "Glass bottles and jars.",
    },
    {
      title: "Metals",
      image: "/waste/metal.jpg",
      description: "Aluminium cans and metal containers.",
    },
    {
      title: "Organic Waste",
      image: "/waste/organic.jpg",
      description: "Food waste and biodegradable materials.",
    },
    {
      title: "E-Waste",
      image: "/waste/ewaste.jpg",
      description: "Electronic items like chargers and batteries.",
    },
    {
      title: "Cloth Waste",
      image: "/waste/cloth.jpg",
      description: "Old clothes and textile materials.",
    },
  ];

  return (
    <>
      {/* Banner */}
      <div className="banner">
        <div className="banner-content">
          <h1>Smart Waste Segregation System</h1>
          <p>AI-powered waste classification for cleaner cities</p>
          <button onClick={() => navigate("/classify")}>
            Classify Waste
          </button>
        </div>
      </div>

      {/* Waste Types Cards */}
      <div className="info-section">
        <h2>Types of Waste</h2>

        <div className="waste-cards">
          {wasteTypes.map((waste, index) => (
            <div
              key={index}
              className="waste-card"
              onClick={() => navigate(`/waste/${index}`)}
            >
              <img src={waste.image} alt={waste.title} />
              <h3>{waste.title}</h3>
              <p>{waste.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default LandingPage;
