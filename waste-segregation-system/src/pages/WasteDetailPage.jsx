import "./WasteDetailPage.css";
import { useNavigate, useParams } from "react-router-dom";

const wasteData = [
    {
        title: "Paper & Cardboard",
        image: "/waste/paper.jpg",
        bin: {
            color: "blue",
            label: "Blue Bin – Dry & Recyclable Waste",
        },
        prepare: [
            "Ensure the paper is clean and dry",
            "Remove plastic covers, tape, and staples",
        ],
        dispose: [
            "Flatten cardboard boxes",
            "Bundle papers together if possible",
            "Place in the paper/cardboard recycling bin",
        ],
        donts: [
            "Do not dispose wet or oil-soaked paper",
            "Do not mix with plastic waste",
        ],
    },
    {
        title: "Plastics",
        image: "/waste/plastic.jpeg",
        bin: {
            color: "blue",
            label: "Blue Bin – Dry & Recyclable Waste",
        },
        prepare: [
            "Rinse plastic items to remove food residue",
            "Remove caps and labels if possible",
        ],
        dispose: [
            "Crush bottles to save space",
            "Separate soft plastics from hard plastics",
            "Place in the blue recycling bin",
        ],
        donts: [
            "Do not burn plastic",
            "Do not mix with organic waste",
        ],
    },
    {
        title: "Glass",
        image: "/waste/glass.jpg",
        bin: {
            color: "blue",
            label: "Blue Bin – Dry & Recyclable Waste",
        },
        prepare: [
            "Rinse glass bottles and jars",
            "Remove metal or plastic lids",
        ],
        dispose: [
            "Keep glass items unbroken",
            "Place in designated glass collection bins",
        ],
        donts: [
            "Do not mix broken glass with household waste",
            "Do not dispose mirrors or bulbs with glass",
        ],
    },
    {
        title: "Metals",
        image: "/waste/metal.jpg",
        bin: {
            color: "blue",
            label: "Blue Bin – Dry & Recyclable Waste",
        },
        prepare: [
            "Clean metal containers thoroughly",
            "Remove food residues",
        ],
        dispose: [
            "Flatten cans if possible",
            "Place in metal recycling bin",
        ],
        donts: [
            "Do not mix with hazardous waste",
            "Do not dispose sharp metals uncovered",
        ],
    },
    {
        title: "Organic Waste",
        image: "/waste/organic.jpg",
        bin: {
            color: "green",
            label: "Green Bin – Organic / Wet Waste",
        },
        prepare: [
            "Separate food waste from packaging",
            "Remove plastic contamination",
        ],
        dispose: [
            "Use compost bins",
            "Convert waste into manure where possible",
        ],
        donts: [
            "Do not mix with plastic or metal waste",
            "Do not dispose in dry waste bins",
        ],
    },
    {
        title: "E-Waste",
        image: "/waste/ewaste.jpg",
        bin: {
            color: "red",
            label: "Red Bin – not Recyclable Waste",
        },
        prepare: [
            "Collect electronic items separately",
            "Remove batteries if possible",
        ],
        dispose: [
            "Give to authorized e-waste collection centers",
            "Participate in e-waste drives",
        ],
        donts: [
            "Do not throw in household bins",
            "Do not break electronic items",
        ],
    },
    {
        title: "Cloth Waste",
        image: "/waste/cloth.jpg",
        bin: {
            color: "blue",
            label: "Blue Bin – Dry & Recyclable Waste",
        },
        prepare: [
            "Separate usable and unusable clothes",
            "Wash reusable clothes if donating",
        ],
        dispose: [
            "Donate wearable clothes",
            "Send damaged textiles for recycling",
        ],
        donts: [
            "Do not throw usable clothes in trash",
            "Do not burn textile waste",
        ],
    },
];


function WasteDetailPage() {
    const { id } = useParams();
    const waste = wasteData[id];

    if (!waste) {
        return <h2 style={{ textAlign: "center" }}>Invalid waste type</h2>;
    }

    const navigate = useNavigate();

    return (
        <div className="waste-detail">
            <h1 className="waste-title">{waste.title}</h1>

            <div
                className={`bin-badge bin-${waste.bin.color}`}
            >
                {waste.bin.label}
            </div>


            <img
                src={waste.image}
                alt={waste.title}
                className="waste-image"
            />

            <div className="section prepare">
                <h2>Preparation Steps</h2>
                <ul>
                    {waste.prepare.map((step, index) => (
                        <li key={index}>{step}</li>
                    ))}
                </ul>
            </div>

            <div className="section dispose">
                <h2>How to Dispose</h2>
                <ul>
                    {waste.dispose.map((step, index) => (
                        <li key={index}>{step}</li>
                    ))}
                </ul>
            </div>

            <div className="section donts">
                <h2>Do’s & Don’ts</h2>
                <ul>
                    {waste.donts.map((step, index) => (
                        <li key={index}>{step}</li>
                    ))}
                </ul>
            </div>

            <button className="back-btn" onClick={() => navigate("/")}>
                ← Back to Home
            </button>
        </div>
    );

}

export default WasteDetailPage;
