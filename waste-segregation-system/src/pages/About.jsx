import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./About.css";

function About() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const { name, email, message } = formData;
    const myEmail = "dharshinisampathkumarklt@gmail.com"; // <-- Put your real email here
    const subject = encodeURIComponent(`Message from ${name} via Waste Project`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
  
    // This is the "sendto" magic
    window.location.href = `mailto:${myEmail}?subject=${subject}&body=${body}`;
    
    setSubmitted(true);
  };

  return (
    <div className="about-container">
      {/* Consistent Header */}
      <header className="about-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          ← Home
        </button>
        <h2 className="header-title">About Project</h2>
      </header>

      <main className="about-content">
        {/* Project Section */}
        <section className="about-section hero-card">
          <h1>Smart Waste Segregation</h1>
          <p className="hero-subtitle">
            An advanced AI solution designed to automate waste classification and promote environmental sustainability.
          </p>
          <div className="tech-tags">
            <span>TensorFlow Lite</span>
            <span>ResNet50</span>
            <span>FastAPI</span>
            <span>React</span>
            <span>Deep Learning</span>
          </div>
        </section>

        <div className="about-grid">
          {/* Technical Deep Dive */}
          <section className="tech-details-card">
            <h3>Technical Architecture</h3>
            <div className="tech-item">
              <strong>Computer Vision:</strong>
              <p>Uses Transfer Learning on ResNet50 to identify 7+ categories of waste with high confidence.</p>
            </div>
            <div className="tech-item">
              <strong>Edge Inference:</strong>
              <p>TFLite integration allows the model to run efficiently on standard server hardware without GPU requirements.</p>
            </div>
            <div className="tech-item">
              <strong>Scalability:</strong>
              <p>The backend handles bulk ZIP uploads using asynchronous processing and automated file organization.</p>
            </div>
          </section>

          {/* Author Section */}
          <section className="author-card">
            <div className="author-avatar">D</div>
            <h3>About the Developer</h3>
            <p className="author-name">Dharshini</p>
            <p className="author-bio">
              A developer passionate about creating technology that solves real-world ecological problems. 
              Specializing in Machine Learning , Deep Learning , Computer Vision and Unity game developement.
            </p>
          </section>
        </div>

        {/* Contact Form */}
        <section className="contact-section">
          <h3>Get in Touch</h3>
          {submitted ? (
            <div className="form-success-msg">
              <h4>Thank you!</h4>
              <p>Your message has been sent successfully. I will get back to you soon.</p>
              <button onClick={() => setSubmitted(false)}>Send another</button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Your Name" 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="yourname@example.com" 
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea 
                  required 
                  rows="4"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="How can I help you?"
                ></textarea>
              </div>
              <button type="submit" className="submit-btn">Send Message</button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

export default About;