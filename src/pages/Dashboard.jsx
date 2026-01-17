import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Mock aviation doctors data
const aviationDoctors = [
  { id: 1, name: 'Dr. Sarah Johnson', specialization: 'Aviation Medicine', experience: '15 years', availability: 'Mon-Fri', verified: true },
  { id: 2, name: 'Dr. Michael Chen', specialization: 'Aeromedical Examiner', experience: '12 years', availability: 'Tue-Sat', verified: true },
  { id: 3, name: 'Dr. Emma Williams', specialization: 'Flight Medicine', experience: '18 years', availability: 'Mon-Thu', verified: true },
  { id: 4, name: 'Dr. James Brown', specialization: 'Aviation Safety Medicine', experience: '10 years', availability: 'Wed-Sat', verified: false },
];

// Comprehensive marketplace listings (All aviation services)
const mockListings = [
  // MEDICAL SERVICES
  { id: 1, title: 'Class 1 Aviation Medical Certificate', seller: 'Dr. Sarah Johnson - DAME', category: 'Medical', subcategory: 'DAME', price: 1200, status: 'Available', doc: 'Medical Certificate', verified: true },
  { id: 2, title: 'Class 2 Medical & Occupational Health Assessment', seller: 'Health Specialists SA', category: 'Medical', subcategory: 'Occupational Health', price: 950, status: 'Available', doc: 'Medical Certificate', verified: true },
  { id: 3, title: 'Aviation Psychology Assessment', seller: 'Psych Prof Consultancy', category: 'Medical', subcategory: 'Psychology', price: 2500, status: 'Available', doc: 'Psychological Report', verified: true },

  // MRO & MAINTENANCE
  { id: 4, title: 'Avionics System Overhaul', seller: 'Premier MRO Ltd', category: 'MRO', subcategory: 'Maintenance', price: 15000, status: 'Available', doc: 'Form 1', verified: true },
  { id: 5, title: 'Engine Component Inspection', seller: 'Aero Services', category: 'MRO', subcategory: 'Maintenance', price: 8500, status: 'Available', doc: 'Release to Service', verified: true },
  { id: 6, title: 'Aircraft Landing Gear Overhaul', seller: 'Specialized Components Inc', category: 'MRO', subcategory: 'Maintenance', price: 22000, status: 'Available', doc: 'Form 1', verified: true },

  // REGULATORY & CONSULTING
  { id: 7, title: 'Air Service License Preparation & Guidance', seller: 'Ex-Aeromarket Inspector Consultancy', category: 'Regulatory', subcategory: 'Regulatory Specialist', price: 5000, status: 'Available', doc: 'Audit Report', verified: true },
  { id: 8, title: 'Remote Operator Certificate (ROC) Audit', seller: 'Drone Compliance Experts', category: 'Regulatory', subcategory: 'Regulatory Specialist', price: 3500, status: 'Available', doc: 'Audit Report', verified: true },
  { id: 9, title: 'PMP-certified Project Management for Aviation', seller: 'Global Aviation PM Consultants', category: 'Regulatory', subcategory: 'Project Manager', price: 7500, status: 'Available', doc: 'Project Charter', verified: true },

  // TRAINING & CERTIFICATION
  { id: 10, title: 'Type Rating Training - Boeing 737', seller: 'CAA-Approved Flight Academy', category: 'Training', subcategory: 'ATO', price: 45000, status: 'Available', doc: 'Certificate of Completion', verified: true },
  { id: 11, title: 'Skills Test & Proficiency Check', seller: 'Designated Flight Examiners (DFE)', category: 'Training', subcategory: 'DFE', price: 3200, status: 'Available', doc: 'Skills Test Report', verified: true },
  { id: 12, title: 'Aircraft Maintenance EASA Part 66 Course', seller: 'Flight Academy', category: 'Training', subcategory: 'ATO', price: 8000, status: 'Available', doc: 'Certificate of Completion', verified: true },

  // OEM & PARTS SUPPLIERS
  { id: 13, title: 'Genuine Airbus A320 Cabin Door Assembly', seller: 'Airbus Direct OEM', category: 'Parts', subcategory: 'OEM', price: 125000, status: 'Available', doc: 'Certificate of Authenticity', verified: true },
  { id: 14, title: 'Avionics Navigation System (Garmin GNS430)', seller: 'Garmin Authorized Distributor', category: 'Parts', subcategory: 'Parts Supplier', price: 18500, status: 'Available', doc: 'Warranty Certificate', verified: true },
  { id: 15, title: 'Engine Thrust Reverser Assembly', seller: 'Rolls-Royce Spare Parts', category: 'Parts', subcategory: 'OEM', price: 320000, status: 'Available', doc: 'Certificate of Airworthiness', verified: true },
  { id: 16, title: 'Specialized Hydraulic Pump (A-Stock)', seller: 'Parker Aerospace', category: 'Parts', subcategory: 'Parts Supplier', price: 8900, status: 'Available', doc: 'Certification of Airworthiness', verified: true },

  // DRONE (UAS) SERVICES & HARDWARE
  { id: 17, title: 'BVLOS Drone Hardware Kit - DJI Matrice 350 RTK', seller: 'DJI Enterprise Authorized Distributor', category: 'Drone', subcategory: 'UAS Manufacturer', price: 89000, status: 'Available', doc: 'BVLOS Hardware Spec', verified: true },
  { id: 18, title: 'Drone BVLOS Compliance Audit', seller: 'RPAS Compliance', category: 'Drone', subcategory: 'UAS Manufacturer', price: 5000, status: 'Available', doc: 'Audit Certificate', verified: true },
  { id: 19, title: 'UAS for Agricultural Mapping', seller: 'Precision Ag Drones SA', category: 'Drone', subcategory: 'UAS Manufacturer', price: 35000, status: 'Available', doc: 'BVLOS Certificate', verified: false },

  // FUEL & LOGISTICS
  { id: 20, title: 'Jet A-1 Fuel Supply - Per 1000L', seller: 'Global Aviation Fuel Ltd', category: 'Logistics', subcategory: 'Fuel Provider', price: 65000, status: 'Available', doc: 'Fuel Certificate', verified: true },
  { id: 21, title: 'AOG (Aircraft on Ground) Emergency Logistics', seller: 'International Logistics Network', category: 'Logistics', subcategory: 'Logistics Provider', price: 12000, status: 'Available', doc: 'Logistics Agreement', verified: true },
  { id: 22, title: 'Global Maintenance Support & Dispatch', seller: 'Aviation Logistics Hub', category: 'Logistics', subcategory: 'Logistics Provider', price: 8500, status: 'Available', doc: 'Service Agreement', verified: true },

  // SOFTWARE & DIGITAL TOOLS
  { id: 23, title: 'Flight Management System (FMS) Upgrade', seller: 'Collins Aerospace Software', category: 'Software', subcategory: 'Software Provider', price: 250000, status: 'Available', doc: 'Software License', verified: true },
  { id: 24, title: 'Safety Management System (SMS) Implementation', seller: 'Aviation Safety Tech', category: 'Software', subcategory: 'Software Provider', price: 45000, status: 'Available', doc: 'Implementation Plan', verified: true },
  { id: 25, title: 'Digital Audit & Compliance Tracking Tool', seller: 'Compliance Automation Inc', category: 'Software', subcategory: 'Software Provider', price: 15000, status: 'Available', doc: 'License Certificate', verified: true },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('patient'); // patient, seller, admin
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [signOffMessage, setSignOffMessage] = useState('');
  const [listings, setListings] = useState(mockListings);
  const [newListing, setNewListing] = useState({ title: '', category: '', price: '', doc: '' });
  const [listingMessage, setListingMessage] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  
  // BUYER JOURNEY STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  
  // SELLER JOURNEY STATES
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerListings, setSellerListings] = useState([]);
  const [completionProof, setCompletionProof] = useState(null);
  
  // PROFILE & DOCUMENT STATES
  const [userProfile, setUserProfile] = useState({
    fullName: localStorage.getItem('userFullName') || '',
    email: localStorage.getItem('userEmail') || 'user@aeromarket.com',
    phone: localStorage.getItem('userPhone') || '',
    company: localStorage.getItem('userCompany') || '',
    position: localStorage.getItem('userPosition') || '',
    profileComplete: false
  });
  const [complianceDocuments, setComplianceDocuments] = useState(JSON.parse(localStorage.getItem('complianceDocuments')) || []);
  const [editingProfile, setEditingProfile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  
  // JOB MARKET STATES
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobFilterCategory, setJobFilterCategory] = useState('');
  const [appliedJobs, setAppliedJobs] = useState(JSON.parse(localStorage.getItem('appliedJobs')) || []);
  const [savedJobs, setSavedJobs] = useState(JSON.parse(localStorage.getItem('savedJobs')) || []);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobApplications, setJobApplications] = useState([]);
  const [postedJobs, setPostedJobs] = useState(JSON.parse(localStorage.getItem('postedJobs')) || []);
  const [newJobPosting, setNewJobPosting] = useState({ title: '', company: '', location: '', salary: '', experience: '', jobType: '', description: '' });
  const [jobPostingMessage, setJobPostingMessage] = useState('');
  
  // Mock Aviation Jobs Data
  const mockJobs = [
    { id: 1, title: 'Commercial Pilot', company: 'South African Airways', location: 'Johannesburg', salary: 'R450,000 - R650,000/year', experience: '1,500+ hours', jobType: 'Full-time', category: 'Pilot', description: 'Seeking experienced commercial pilot for domestic and regional routes', postedDate: '2 days ago', applicants: 8, verified: true },
    { id: 2, title: 'Aircraft Maintenance Engineer', company: 'Premier MRO Ltd', location: 'Cape Town', salary: 'R380,000 - R520,000/year', experience: '5+ years', jobType: 'Full-time', category: 'Engineering', description: 'EASA Part 66 certified engineer needed for our MRO facility', postedDate: '1 week ago', applicants: 15, verified: true },
    { id: 3, title: 'Avionics Technician', company: 'Aerotech Solutions', location: 'Durban', salary: 'R280,000 - R400,000/year', experience: '3+ years', jobType: 'Full-time', category: 'Engineering', description: 'Specialist in glass cockpit systems and modern avionics', postedDate: '3 days ago', applicants: 5, verified: true },
    { id: 4, title: 'Flight Attendant', company: 'Safair', location: 'Johannesburg', salary: 'R200,000 - R300,000/year', experience: 'Entry-level', jobType: 'Full-time', category: 'Crew', description: 'Join our cabin crew team for regional and international flights', postedDate: '5 days ago', applicants: 42, verified: true },
    { id: 5, title: 'Chief Pilot', company: 'Private Aviation Specialists', location: 'Pretoria', salary: 'R700,000 - R950,000/year', experience: '5,000+ hours', jobType: 'Full-time', category: 'Pilot', description: 'Management role for charter operation with 50+ aircraft fleet', postedDate: '1 week ago', applicants: 3, verified: true },
    { id: 6, title: 'Drone Pilot (BVLOS)', company: 'Precision Aerial Services', location: 'Remote', salary: 'R250,000 - R380,000/year', experience: 'ROC + BVLOS cert', jobType: 'Full-time', category: 'Drone', description: 'Operate BVLOS drones for agricultural and infrastructure surveying', postedDate: '2 days ago', applicants: 12, verified: true },
    { id: 7, title: 'Quality Assurance Manager', company: 'Aviation Safety Systems', location: 'Johannesburg', salary: 'R420,000 - R580,000/year', experience: '8+ years', jobType: 'Full-time', category: 'Management', description: 'Oversee compliance and QA for aviation operations', postedDate: '4 days ago', applicants: 7, verified: true },
    { id: 8, title: 'Dispatch Officer', company: 'TransAir Logistics', location: 'Johannesburg', salary: 'R200,000 - R300,000/year', experience: '2+ years', jobType: 'Full-time', category: 'Operations', description: 'Coordinate daily flight operations and crew scheduling', postedDate: '6 days ago', applicants: 18, verified: false },
    { id: 9, title: 'Regulatory Compliance Officer', company: 'Aeromarket Consulting', location: 'Online', salary: 'R350,000 - R480,000/year', experience: '5+ years', jobType: 'Full-time', category: 'Regulatory', description: 'Ensure compliance with CAA and international aviation regulations', postedDate: '3 days ago', applicants: 9, verified: true },
    { id: 10, title: 'Helicopter Pilot', company: 'Emergency Medical Services', location: 'Nationwide', salary: 'R480,000 - R680,000/year', experience: '500+ hours helicopter', jobType: 'Full-time', category: 'Pilot', description: 'Medical evacuation and emergency response operations', postedDate: '1 week ago', applicants: 14, verified: true },
  ];
  
  // ADMIN STATES
  const [heatmapData, setHeatmapData] = useState({
    searchPage: 45,
    productDetail: 78,
    checkout: 92,
    review: 34,
    registration: 28
  });

  useEffect(() => {
    // Set role based on token or default to patient (allow public access)
    const token = localStorage.getItem('token');
    // Public access enabled - no redirect required
    if (token) {
      try {
        // Simple check - if token contains 'admin', set admin role
        if (token.includes('admin')) setUserRole('admin');
        else setUserRole('patient');
      } catch (err) {
        console.error('Token error:', err);
        setUserRole('patient');
      }
    }
  }, []);

  // ============ BUYER JOURNEY FUNCTIONS ============
  const filteredListings = listings.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.seller.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product) => {
    setCart([...cart, { ...product, cartId: Date.now() }]);
    setSearchQuery('');
    setFilterCategory('');
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const completeCheckout = () => {
    const newOrders = cart.map(item => ({
      orderId: `ORD-${Date.now()}`,
      ...item,
      status: 'Pending Fulfillment',
      orderDate: new Date().toLocaleDateString(),
      trackingStatus: 'Order Placed'
    }));
    setOrders([...orders, ...newOrders]);
    setCart([]);
    alert('✅ Order placed successfully! Check "My Orders" to track.');
  };

  const submitReview = (orderId, rating, comment) => {
    const order = orders.find(o => o.orderId === orderId);
    setReviews([...reviews, {
      reviewId: Date.now(),
      orderId,
      seller: order.seller,
      rating,
      comment,
      date: new Date().toLocaleDateString()
    }]);
    alert('✅ Thank you! Your review helps the community.');
  };

  // ============ TECHNICAL SIGN-OFF SECTION ============
  const handleTechnicalSignOff = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const submitSignOff = (transactionId, status) => {
    if (!documentFile && status === 'ACCEPTED') {
      setSignOffMessage('❌ Please upload required documentation');
      return;
    }

    // Update transaction status
    setTransactions(transactions.map(txn => 
      txn.transactionId === transactionId 
        ? { ...txn, status: status === 'ACCEPTED' ? 'Completed - Funds Released' : 'Revision Requested', escrowStatus: status === 'ACCEPTED' ? 'RELEASED' : 'PENDING' }
        : txn
    ));

    setSignOffMessage(status === 'ACCEPTED' 
      ? '✅ Technical Sign-off Accepted! Funds released to seller.' 
      : '⚠️ Revision requested. Seller will be notified.');
    
    setSelectedTransaction(null);
    setDocumentFile(null);
    
    setTimeout(() => setSignOffMessage(''), 3000);
  };

  // ============ PROFILE MANAGEMENT ============
  const saveProfile = () => {
    if (!userProfile.fullName || !userProfile.email || !userProfile.phone) {
      setProfileMessage('❌ Please fill all required fields');
      return;
    }
    
    localStorage.setItem('userFullName', userProfile.fullName);
    localStorage.setItem('userEmail', userProfile.email);
    localStorage.setItem('userPhone', userProfile.phone);
    localStorage.setItem('userCompany', userProfile.company);
    localStorage.setItem('userPosition', userProfile.position);
    
    setProfileMessage('✅ Profile saved successfully!');
    setEditingProfile(false);
    setTimeout(() => setProfileMessage(''), 3000);
  };

  // ============ COMPLIANCE DOCUMENT UPLOAD ============
  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileSize = file.size / (1024 * 1024); // Convert to MB
    if (fileSize > 10) {
      setUploadMessage('❌ File size must be less than 10MB');
      return;
    }

    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setUploadMessage('❌ Only PDF, PNG, JPG, DOC, DOCX files allowed');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const newDoc = {
        id: Date.now(),
        fileName: file.name,
        fileType: file.type,
        fileSize: (fileSize).toFixed(2),
        uploadDate: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
        documentType: 'License',
        verificationStatus: 'Pending Review',
        base64: event.target.result
      };

      const updatedDocs = [...complianceDocuments, newDoc];
      setComplianceDocuments(updatedDocs);
      localStorage.setItem('complianceDocuments', JSON.stringify(updatedDocs));
      
      setUploadMessage('✅ Document uploaded successfully! Pending admin review.');
      e.target.value = '';
      setTimeout(() => setUploadMessage(''), 3000);
    };
    reader.readAsDataURL(file);
  };

  const deleteDocument = (docId) => {
    const updatedDocs = complianceDocuments.filter(doc => doc.id !== docId);
    setComplianceDocuments(updatedDocs);
    localStorage.setItem('complianceDocuments', JSON.stringify(updatedDocs));
  };

  // ============ JOB MARKET FUNCTIONS ============
  const filteredJobs = mockJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(jobSearchQuery.toLowerCase()) || 
                         job.company.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
                         job.location.toLowerCase().includes(jobSearchQuery.toLowerCase());
    const matchesCategory = !jobFilterCategory || job.category === jobFilterCategory;
    return matchesSearch && matchesCategory;
  });

  const applyForJob = (job) => {
    const application = {
      id: Date.now(),
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      salary: job.salary,
      appliedDate: new Date().toLocaleDateString(),
      status: 'Under Review'
    };

    const updatedApplied = [...appliedJobs, application];
    setAppliedJobs(updatedApplied);
    localStorage.setItem('appliedJobs', JSON.stringify(updatedApplied));
    alert('✅ Application submitted! You can track it in "My Applications"');
    setSelectedJob(null);
  };

  const saveJob = (job) => {
    if (savedJobs.some(j => j.id === job.id)) {
      const updatedSaved = savedJobs.filter(j => j.id !== job.id);
      setSavedJobs(updatedSaved);
      localStorage.setItem('savedJobs', JSON.stringify(updatedSaved));
      alert('❌ Job removed from saved');
    } else {
      const updatedSaved = [...savedJobs, job];
      setSavedJobs(updatedSaved);
      localStorage.setItem('savedJobs', JSON.stringify(updatedSaved));
      alert('✅ Job saved for later!');
    }
  };

  const postNewJob = (e) => {
    e.preventDefault();
    if (!newJobPosting.title || !newJobPosting.company || !newJobPosting.location || !newJobPosting.salary) {
      setJobPostingMessage('❌ Please fill all required fields');
      return;
    }

    const job = {
      id: mockJobs.length + 1000,
      ...newJobPosting,
      postedDate: 'Today',
      applicants: 0,
      verified: false,
      category: newJobPosting.jobType
    };

    const updatedJobs = [...postedJobs, job];
    setPostedJobs(updatedJobs);
    localStorage.setItem('postedJobs', JSON.stringify(updatedJobs));
    
    setJobPostingMessage('✅ Job posted successfully! Pending admin verification.');
    setNewJobPosting({ title: '', company: '', location: '', salary: '', experience: '', jobType: '', description: '' });
    setTimeout(() => setJobPostingMessage(''), 3000);
  };

  // ============ SELLER/MRO SECTION ============
  const handleCreateListing = (e) => {
    e.preventDefault();
    
    if (!newListing.title || !newListing.category || !newListing.price || !newListing.doc) {
      setListingMessage('❌ Please fill in all fields');
      return;
    }

    const listing = {
      id: listings.length + 1,
      ...newListing,
      seller: 'Your Company',
      status: 'Available',
      verified: false, // Requires admin approval
      price: parseFloat(newListing.price)
    };

    setListings([...listings, listing]);
    setListingMessage('✅ Listing created! Pending admin verification.');
    setNewListing({ title: '', category: '', price: '', doc: '' });
    
    setTimeout(() => setListingMessage(''), 3000);
  };

  // ============ ADMIN SECTION ============
  const handleAdminApprove = (listingId) => {
    setListings(listings.map(listing => 
      listing.id === listingId ? { ...listing, verified: true } : listing
    ));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============ TOP NAVIGATION BAR ============ */}
      <nav className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 border-b-4 border-blue-800 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-4xl font-black animate-bounce" style={{animationDuration: '2s'}}>✈️</span>
              <div>
                <h1 className="text-2xl font-black text-white">Aeromarket</h1>
                <p className="text-xs text-blue-100 font-semibold">Aviation Marketplace</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search services, parts, jobs..."
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-6 py-3 border-2 border-blue-300 rounded-full focus:outline-none focus:border-yellow-300 bg-white placeholder-gray-500 font-semibold"
                />
                <span className="absolute right-4 top-3.5 text-gray-400 text-xl">🔍</span>
              </div>
            </div>

            {/* Top Right Icons */}
            <div className="flex items-center gap-3 min-w-fit">
              <button onClick={() => setActiveTab('browse')} className="hidden md:flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-full font-bold transition transform hover:scale-105">
                🛍️ Browse
              </button>
              <button onClick={() => setActiveTab('jobs')} className="hidden md:flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-full font-bold transition transform hover:scale-105">
                💼 Jobs
              </button>
              <div className="relative cursor-pointer group">
                <button className="text-2xl p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition">❤️</button>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full">{savedJobs.length}</span>
              </div>
              <div className="relative cursor-pointer group">
                <button onClick={() => navigate('/cart')} className="text-2xl p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition">🛒</button>
                <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-xs font-black px-2 py-1 rounded-full">{cart.length}</span>
              </div>
              <div className="relative group">
                <button className="text-2xl p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition">👤</button>
                <div className="absolute right-0 mt-2 w-56 bg-white shadow-xl rounded-lg p-4 hidden group-hover:block z-50">
                  <p className="font-black text-gray-800 mb-1">Role: <span className="text-blue-600">{userRole.toUpperCase()}</span></p>
                  <hr className="my-2" />
                  <button onClick={() => setActiveTab('profile')} className="block w-full text-left px-4 py-2 hover:bg-blue-100 rounded font-semibold transition">👤 My Profile</button>
                  <button onClick={() => setActiveTab('documents')} className="block w-full text-left px-4 py-2 hover:bg-blue-100 rounded font-semibold transition">📄 Documents</button>
                  <button onClick={() => setActiveTab('orders')} className="block w-full text-left px-4 py-2 hover:bg-blue-100 rounded font-semibold transition">📦 My Orders</button>
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-2 hover:bg-red-100 rounded font-semibold text-red-600 mt-2 transition">Logout</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Menu */}
        <div className="border-t border-blue-500 bg-blue-600 bg-opacity-50 px-4 py-2">
          <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => navigate('/category/Medical')} className="flex items-center gap-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap transition">
              🏥 Medical
            </button>
            <button onClick={() => navigate('/category/MRO')} className="flex items-center gap-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap transition">
              🔧 MRO
            </button>
            <button onClick={() => navigate('/category/Training')} className="flex items-center gap-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap transition">
              ✈️ Training
            </button>
            <button onClick={() => navigate('/category/Parts')} className="flex items-center gap-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap transition">
              📦 Parts
            </button>
            <button onClick={() => navigate('/category/Drone')} className="flex items-center gap-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap transition">
              🚁 Drones
            </button>
            <button onClick={() => setActiveTab('jobs')} className="flex items-center gap-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap transition">
              💼 Job Market
            </button>
          </div>
        </div>
      </nav>

      {/* ============ MAIN MARKETPLACE LAYOUT ============ */}
      <div className="max-w-7xl mx-auto">
        {/* Show homepage on initial load */}
        {activeTab === 'browse' && userRole === 'patient' && !filterCategory && !searchQuery && (
          <>
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-12 rounded-xl m-4 mt-6">
              <h2 className="text-5xl font-black mb-4">Welcome to Aeromarket</h2>
              <p className="text-xl mb-6">Your trusted platform for aviation services, parts, jobs, and expertise</p>
              <div className="flex gap-4 flex-wrap">
                <button onClick={() => navigate('/category/Medical')} className="bg-white text-blue-600 px-8 py-3 rounded-full font-black hover:bg-gray-100 transition">🏥 Medical Services</button>
                <button onClick={() => navigate('/category/Training')} className="bg-white text-blue-600 px-8 py-3 rounded-full font-black hover:bg-gray-100 transition">✈️ Training</button>
                <button onClick={() => setActiveTab('jobs')} className="bg-white text-blue-600 px-8 py-3 rounded-full font-black hover:bg-gray-100 transition">💼 Find Jobs</button>
              </div>
            </div>

            {/* Featured Categories Grid */}
            <div className="p-4 mt-6">
              <h3 className="text-3xl font-black text-gray-900 mb-6">Explore Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: '🏥', label: 'Medical', color: 'from-red-100 to-pink-100', border: 'border-red-400' },
                  { icon: '🔧', label: 'MRO', color: 'from-orange-100 to-yellow-100', border: 'border-orange-400' },
                  { icon: '📋', label: 'Regulatory', color: 'from-blue-100 to-cyan-100', border: 'border-blue-400' },
                  { icon: '✈️', label: 'Training', color: 'from-green-100 to-emerald-100', border: 'border-green-400' },
                  { icon: '📦', label: 'Parts', color: 'from-purple-100 to-pink-100', border: 'border-purple-400' },
                  { icon: '🚁', label: 'Drones', color: 'from-yellow-100 to-orange-100', border: 'border-yellow-400' },
                  { icon: '🌍', label: 'Logistics', color: 'from-teal-100 to-cyan-100', border: 'border-teal-400' },
                  { icon: '💻', label: 'Software', color: 'from-indigo-100 to-purple-100', border: 'border-indigo-400' },
                ].map((cat, idx) => (
                  <button 
                    key={idx}
                    onClick={() => navigate(`/category/${cat.label}`)}
                    className={`bg-gradient-to-br ${cat.color} border-2 ${cat.border} p-6 rounded-2xl hover:shadow-lg transition transform hover:scale-105 cursor-pointer`}
                  >
                    <p className="text-5xl mb-2">{cat.icon}</p>
                    <p className="font-black text-gray-800">{cat.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Featured Products Section */}
            <div className="p-4 mt-8">
              <h3 className="text-3xl font-black text-gray-900 mb-6">⭐ Featured Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {mockListings.slice(0, 8).map((listing) => (
                  <div 
                    key={listing.id}
                    onClick={() => navigate(`/product/${listing.id}`)}
                    className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition transform hover:scale-105 cursor-pointer border-2 border-gray-200 hover:border-blue-500"
                  >
                    <div className={`p-4 min-h-24 flex flex-col ${listing.verified ? 'bg-green-50' : 'bg-yellow-50'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-2xl">{listing.category === 'Medical' && '🏥'}{listing.category === 'MRO' && '🔧'}{listing.category === 'Regulatory' && '📋'}{listing.category === 'Training' && '✈️'}{listing.category === 'Parts' && '📦'}{listing.category === 'Drone' && '🚁'}{listing.category === 'Logistics' && '🌍'}{listing.category === 'Software' && '💻'}</span>
                        {listing.verified && <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-black">✅</span>}
                      </div>
                      <h4 className="font-black text-gray-900 mb-2 line-clamp-2">{listing.title}</h4>
                      <p className="text-sm text-gray-600 font-semibold mb-3 line-clamp-1">{listing.seller}</p>
                      <p className="text-2xl font-black text-blue-600 mt-auto">R{listing.price.toLocaleString()}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); addToCart(listing); }} className="w-full bg-blue-600 text-white py-2 font-black hover:bg-blue-700 transition">Add to Cart</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Regular tab content layout with sidebar */}
        {(activeTab !== 'browse' || filterCategory || searchQuery) && (
          <div className="flex gap-4 p-4 mt-6">
            {/* Left Sidebar - Categories */}
            {['browse'].includes(activeTab) && (
              <div className="w-64 bg-white rounded-xl shadow-md p-6 h-fit sticky top-24">
                <h4 className="font-black text-lg mb-4 text-gray-900">Categories</h4>
                <div className="space-y-2">
                  <button onClick={() => { setFilterCategory(''); setSearchQuery(''); }} className={`w-full text-left px-4 py-2 rounded-lg font-semibold transition ${!filterCategory ? 'bg-blue-100 text-blue-900 border-2 border-blue-500' : 'hover:bg-gray-100'}`}>
                    All Categories
                  </button>
                  {['Medical', 'MRO', 'Regulatory', 'Training', 'Parts', 'Drone', 'Logistics', 'Software'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`w-full text-left px-4 py-2 rounded-lg font-semibold transition ${filterCategory === cat ? 'bg-blue-100 text-blue-900 border-2 border-blue-500' : 'hover:bg-gray-100'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1">
              {/* Navigation Tabs */}
              <div className="bg-white rounded-xl shadow-md p-4 mb-6 overflow-x-auto flex gap-2">
                {userRole === 'patient' && ['browse', 'cart', 'orders', 'reviews', 'jobs', 'profile', 'documents'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 rounded-full font-bold whitespace-nowrap transition transform hover:scale-105 ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {tab === 'browse' && '🔍 Browse'} {tab === 'cart' && `🛒 Cart (${cart.length})`} {tab === 'orders' && `📦 Orders (${orders.length})`} {tab === 'reviews' && '⭐ Reviews'} {tab === 'jobs' && '💼 Jobs'} {tab === 'profile' && '👤 Profile'} {tab === 'documents' && `📄 Docs (${complianceDocuments.length})`}
                  </button>
                ))}
              </div>

        {/* Enhanced Role-based Navigation Tabs with Animations */}
        {/* Tabs are now in the main content area */}

              {/* Browse Tab Content */}
              {activeTab === 'browse' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-2xl font-black text-gray-900 mb-4">Results: {filteredListings.length} found</h3>
                    
                    {filteredListings.length === 0 && searchQuery && (
                      <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-600">
                        <p className="text-yellow-900 font-semibold mb-3">No results for "{searchQuery}"</p>
                        <p className="text-yellow-800 mb-4">Try these suggestions:</p>
                        <div className="space-y-2">
                          {['Medical', 'MRO', 'Training', 'Parts', 'Drone'].map(cat => (
                            <button 
                              key={cat}
                              onClick={() => {
                                setFilterCategory(cat);
                                setSearchQuery('');
                              }}
                              className="block text-blue-600 hover:underline font-semibold"
                            >
                              → Browse {cat} category
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredListings.map(listing => (
                        <div 
                          key={listing.id} 
                          onClick={() => navigate(`/product/${listing.id}`)}
                          className="rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition cursor-pointer border-2 border-gray-100 hover:border-blue-500 bg-white transform hover:scale-105 duration-200"
                        >
                          {/* Image Section */}
                          <div className="relative h-48 bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center overflow-hidden">
                            <div className="text-7xl">{listing.category === 'Medical' ? '🏥' : listing.category === 'MRO' ? '🔧' : listing.category === 'Training' ? '✈️' : listing.category === 'Parts' ? '📦' : listing.category === 'Drone' ? '🚁' : listing.category === 'Logistics' ? '🌍' : listing.category === 'Software' ? '💻' : '📋'}</div>
                            {listing.verified && (
                              <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                                ✅ Verified
                              </div>
                            )}
                          </div>

                          {/* Content Section */}
                          <div className="p-5">
                            <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">{listing.title}</h3>
                            <p className="text-sm text-gray-600 mb-1">
                              <span className="font-semibold">Seller:</span> {listing.seller}
                            </p>
                            <p className="text-blue-600 text-xs font-bold mb-3 bg-blue-50 inline-block px-2 py-1 rounded">{listing.category}</p>
                            
                            <div className="flex justify-between items-center mb-4 border-t border-gray-200 pt-3">
                              <span className="text-2xl font-black text-blue-700">R{listing.price.toLocaleString()}</span>
                              <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-bold">⭐ 4.8</span>
                            </div>
                            
                            <button 
                              onClick={(e) => { e.stopPropagation(); addToCart(listing); }} 
                              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-cyan-700 transition shadow-md hover:shadow-lg transform hover:scale-102"
                            >
                              🛒 Add to Cart
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Product Detail Modal */}
                  {selectedProduct && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
                        <div className="p-8">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h2 className="text-3xl font-bold text-gray-800">{selectedProduct.title}</h2>
                              <p className="text-gray-600 mt-1">{selectedProduct.seller}</p>
                            </div>
                            <button onClick={() => setSelectedProduct(null)} className="text-2xl">✕</button>
                          </div>

                          <div className="bg-blue-50 p-4 rounded-lg mb-6">
                            <p className="text-sm text-gray-600 mb-2"><span className="font-semibold">Category:</span> {selectedProduct.category}</p>
                            <p className="text-sm text-gray-600 mb-2"><span className="font-semibold">Required Doc:</span> {selectedProduct.doc}</p>
                            <p className="text-2xl font-bold text-blue-700 mt-3">R{selectedProduct.price.toLocaleString()}</p>
                          </div>

                          <div className="mb-6">
                            <h3 className="font-bold text-gray-800 mb-2">⭐ Seller Rating: 4.8 out of 5 (124 reviews)</h3>
                            <div className="flex gap-2 mb-4">
                              {['Responsive', 'Professional', 'Reliable', 'Certified'].map(tag => (
                                <span key={tag} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">✓ {tag}</span>
                              ))}
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              addToCart(selectedProduct);
                              setSelectedProduct(null);
                            }}
                            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition mb-2"
                          >
                            🛒 Add to Cart
                          </button>
                          <button 
                            onClick={() => setSelectedProduct(null)}
                            className="w-full bg-gray-400 text-white py-3 rounded-lg font-bold hover:bg-gray-500 transition"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-xl">
              <h2 className="text-3xl font-bold mb-6 text-gray-800">🛒 Shopping Cart</h2>
              
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-xl mb-4">Your cart is empty</p>
                  <button 
                    onClick={() => setActiveTab('browse')}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.cartId} className="border-2 border-gray-300 rounded-lg p-4 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800">{item.title}</h3>
                        <p className="text-gray-600 text-sm">{item.seller}</p>
                        <p className="text-blue-700 font-semibold mt-2">R{item.price.toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.cartId)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-8 rounded-2xl shadow-xl border-2 border-blue-300">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Order Summary</h3>
              
              <div className="space-y-3 mb-6 pb-6 border-b-2 border-blue-300">
                <div className="flex justify-between">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-bold">R{cart.reduce((sum, item) => sum + item.price, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Platform Fee (5%):</span>
                  <span className="font-bold">R{Math.round(cart.reduce((sum, item) => sum + item.price, 0) * 0.05).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between mb-6">
                <span className="text-xl font-bold text-gray-800">Total:</span>
                <span className="text-3xl font-bold text-blue-700">R{Math.round(cart.reduce((sum, item) => sum + item.price, 0) * 1.05).toLocaleString()}</span>
              </div>

              <div className="bg-green-100 p-4 rounded-lg mb-6 border-l-4 border-green-600">
                <p className="text-green-800 text-sm"><span className="font-bold">✅ Secure Escrow:</span> Funds held until you verify completion</p>
              </div>

              {cart.length > 0 && (
                <button 
                  onClick={completeCheckout}
                  className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition"
                >
                  💳 Proceed to Checkout
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============ BUYER JOURNEY: ORDER TRACKING & DELIVERY ============ */}
        {userRole === 'patient' && activeTab === 'orders' && (
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">📦 My Orders & Tracking</h2>
            
            {orders.length === 0 ? (
              <p className="text-center text-gray-500 py-12 text-lg">No orders yet. Browse services to get started!</p>
            ) : (
              <div className="space-y-6">
                {orders.map(order => (
                  <div key={order.orderId} className="border-2 border-blue-300 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-white">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800">{order.title}</h3>
                        <p className="text-gray-600">{order.seller}</p>
                        <p className="text-sm text-gray-500 mt-2">Order ID: {order.orderId}</p>
                      </div>
                      <div className="text-right">
                        <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold">{order.status}</span>
                        <p className="text-gray-600 text-sm mt-2">{order.orderDate}</p>
                      </div>
                    </div>

                    <div className="bg-gray-100 p-4 rounded-lg mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-700">Tracking Progress:</span>
                        <span className="text-gray-700">{order.trackingStatus}</span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{width: '75%'}}></div>
                      </div>
                    </div>

                    <p className="text-lg font-bold text-blue-700 mb-4">R{order.price.toLocaleString()}</p>

                    {order.status === 'Delivered' && !reviews.find(r => r.orderId === order.orderId) && (
                      <button 
                        onClick={() => {
                          const rating = prompt('Rate this service (1-5):', '5');
                          const comment = prompt('Add a comment (optional):', '');
                          if (rating) submitReview(order.orderId, parseInt(rating), comment || '');
                        }}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700"
                      >
                        ⭐ Leave Review
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ BUYER JOURNEY: REVIEWS & ADVOCACY ============ */}
        {userRole === 'patient' && activeTab === 'reviews' && (
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">⭐ My Reviews</h2>
            
            {reviews.length === 0 ? (
              <p className="text-center text-gray-500 py-12 text-lg">No reviews yet. Complete an order and leave a review!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.reviewId} className="border-2 border-yellow-300 rounded-lg p-6 bg-yellow-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800">{review.seller}</h3>
                      <span className="text-2xl">{'⭐'.repeat(review.rating)}</span>
                    </div>
                    <p className="text-gray-700 mb-2">{review.comment}</p>
                    <p className="text-sm text-gray-500">Reviewed on {review.date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ BUYER JOURNEY: TRANSACTION SIGN-OFF ============ */}
        {userRole === 'patient' && activeTab === 'transactions' && (
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">💼 Technical Sign-offs & Verification</h2>
            <p className="text-center text-gray-500 py-12 text-lg">Sign-off history will appear here after completing orders with technical verification requirements.</p>
          </div>
        )}

        {/* ============ PATIENT TAB: MARKETPLACE ============ */}
        {userRole === 'patient' && activeTab === 'marketplace' && (
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold mb-2 text-blue-800">Aviation Services & Parts Marketplace</h2>
            <p className="text-gray-600 mb-6">Browse certified sellers across 8 categories: Medical, MRO, Regulatory, Training, OEM/Parts, Drones, Logistics & Software</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(listing => (
                <div key={listing.id} className={`rounded-lg p-6 shadow-lg border-2 transition hover:shadow-xl ${listing.verified ? 'border-green-400 bg-gradient-to-br from-green-50 to-white' : 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-white'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800">{listing.title}</h3>
                      <p className="text-blue-600 text-sm font-semibold mt-1">{listing.category} {listing.subcategory ? `• ${listing.subcategory}` : ''}</p>
                    </div>
                    {listing.verified && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold whitespace-nowrap ml-2">✅ VERIFIED</span>}
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{listing.seller}</p>
                  
                  <div className="bg-gray-100 p-3 rounded mb-3">
                    <p className="text-gray-700 text-xs mb-1"><span className="font-semibold">Required Doc:</span> {listing.doc}</p>
                  </div>
                  
                  <p className="text-3xl font-bold text-blue-700 mb-4">R{listing.price.toLocaleString()}</p>
                  
                  <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition">
                    View & Book
                  </button>
                </div>
              ))}
            </div>

            {/* Category Legend */}
            <div className="mt-12 bg-gray-50 p-6 rounded-lg border-2 border-gray-300">
              <h3 className="font-bold text-lg text-gray-800 mb-4">📚 Service Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><span className="font-bold text-blue-700">🏥 Medical</span><p className="text-sm text-gray-600">DAMEs, Psychologists, Health Specialists</p></div>
                <div><span className="font-bold text-blue-700">🔧 MRO</span><p className="text-sm text-gray-600">Maintenance, Repair & Overhaul</p></div>
                <div><span className="font-bold text-blue-700">📋 Regulatory</span><p className="text-sm text-gray-600">Aeromarket Inspectors, Consultants, PMP</p></div>
                <div><span className="font-bold text-blue-700">✈️ Training</span><p className="text-sm text-gray-600">DFEs, ATOs, Type Ratings</p></div>
                <div><span className="font-bold text-blue-700">📦 Parts</span><p className="text-sm text-gray-600">OEMs, Boeing, Airbus, Suppliers</p></div>
                <div><span className="font-bold text-blue-700">🚁 Drones</span><p className="text-sm text-gray-600">UAS Manufacturers, BVLOS Services</p></div>
                <div><span className="font-bold text-blue-700">🌍 Logistics</span><p className="text-sm text-gray-600">Fuel, AOG Support, Supply Chain</p></div>
                <div><span className="font-bold text-blue-700">💻 Software</span><p className="text-sm text-gray-600">FMS, SMS, Digital Audit Tools</p></div>
              </div>
            </div>
          </div>
        )}

        {/* ============ SELLER TAB: CREATE LISTING ============ */}
        {userRole === 'seller' && activeTab === 'create-listing' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold mb-6 text-blue-800">Create New Listing</h2>
            <form onSubmit={handleCreateListing} className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">Service/Product Title</label>
                <input 
                  type="text" 
                  value={newListing.title}
                  onChange={(e) => setNewListing({...newListing, title: e.target.value})}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-600 transition"
                  placeholder="e.g., Engine Overhaul, Avionics Repair"
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">Category</label>
                <select 
                  value={newListing.category}
                  onChange={(e) => setNewListing({...newListing, category: e.target.value})}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-600 transition"
                  required
                >
                  <option value="">-- Select Category --</option>
                  <option value="Medical">🏥 Medical & Human Factor Practitioners</option>
                  <option value="MRO">🔧 MRO (Maintenance, Repair & Overhaul)</option>
                  <option value="Regulatory">📋 Technical & Regulatory Specialists</option>
                  <option value="Training">✈️ Authorized Training & Testing Entities</option>
                  <option value="Parts">📦 OEMs & Specialized Parts Suppliers</option>
                  <option value="Drone">🚁 UAS (Drone) Manufacturers & Services</option>
                  <option value="Logistics">🌍 Fuel & Logistics Providers</option>
                  <option value="Software">💻 Aviation Software Providers</option>
                </select>
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">Price (ZAR)</label>
                <input 
                  type="number" 
                  value={newListing.price}
                  onChange={(e) => setNewListing({...newListing, price: e.target.value})}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-600 transition"
                  placeholder="e.g., 15000"
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">Required Compliance Documentation</label>
                <select 
                  value={newListing.doc}
                  onChange={(e) => setNewListing({...newListing, doc: e.target.value})}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-600 transition"
                  required
                >
                  <option value="">-- Select Document Type --</option>
                  <option value="Medical Certificate">✅ Medical Certificate (DAME)</option>
                  <option value="Form 1">✅ Aeromarket Form 1 (Release to Service)</option>
                  <option value="Audit Report">✅ Audit Report</option>
                  <option value="BVLOS Hardware Spec">✅ BVLOS Hardware Spec (Drone)</option>
                  <option value="Certificate of Completion">✅ Certificate of Completion (Training)</option>
                  <option value="Skills Test Report">✅ Skills Test Report (DFE)</option>
                  <option value="Project Charter">✅ Project Charter (Consulting)</option>
                  <option value="Psychological Report">✅ Psychological Report (Aviation Psych)</option>
                  <option value="Certificate of Authenticity">✅ Certificate of Authenticity (OEM Parts)</option>
                  <option value="Warranty Certificate">✅ Warranty Certificate (Parts)</option>
                  <option value="Fuel Certificate">✅ Fuel Quality Certificate</option>
                  <option value="Service Agreement">✅ Service Agreement (Logistics)</option>
                  <option value="Software License">✅ Software License Agreement</option>
                </select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                <p className="text-gray-700"><span className="font-semibold">📋 Verification:</span> Your listing will be reviewed by Aeromarket admins. Once approved, it will be marked with a ✅ badge.</p>
              </div>

              {listingMessage && (
                <div className={`p-4 rounded-lg font-semibold text-center ${listingMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {listingMessage}
                </div>
              )}

              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition">
                Submit for Review
              </button>
            </form>
          </div>
        )}

        {/* ============ ADMIN TAB: LISTING VERIFICATION ============ */}
        {userRole === 'admin' && activeTab === 'admin-listings' && (
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold mb-6 text-blue-800">Listing Verification Queue</h2>
            <div className="space-y-4">
              {listings.filter(l => !l.verified).map(listing => (
                <div key={listing.id} className="border-2 border-orange-300 rounded-lg p-6 bg-orange-50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-gray-800">{listing.title}</h3>
                      <p className="text-gray-600">Seller: {listing.seller}</p>
                    </div>
                    <span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-semibold">⏳ PENDING</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div><p className="text-gray-600 text-sm">Category</p><p className="font-semibold">{listing.category}</p></div>
                    <div><p className="text-gray-600 text-sm">Price</p><p className="font-semibold">R{listing.price.toLocaleString()}</p></div>
                    <div><p className="text-gray-600 text-sm">Required Doc</p><p className="font-semibold">{listing.doc}</p></div>
                  </div>
                  <button 
                    onClick={() => handleAdminApprove(listing.id)}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition"
                  >
                    ✅ Approve & Verify
                  </button>
                </div>
              ))}
              {listings.filter(l => !l.verified).length === 0 && (
                <p className="text-center text-gray-500 py-8">All listings are verified!</p>
              )}
            </div>
          </div>
        )}

        {/* ============ ADMIN HEATMAP & USER ANALYTICS ============ */}
        {userRole === 'admin' && activeTab === 'admin-heatmap' && (
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">🔥 User Journey Heatmap - Critical Friction Points</h2>
            
            <div className="space-y-6">
              {/* FRICTION POINT 1: Registration Wall */}
              <div className="border-2 border-red-400 rounded-lg p-6 bg-red-50">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-2xl font-bold text-red-800">1️⃣ Registration Wall - CRITICAL</h3>
                  <span className="text-5xl font-bold text-red-600">{heatmapData.registration}%</span>
                </div>
                <p className="text-red-700 mb-3"><span className="font-bold">Problem:</span> {100 - heatmapData.registration}% drop-off - Users forced to register before browsing</p>
                <div className="bg-red-200 p-4 rounded-lg mb-3">
                  <p className="text-red-900 text-sm"><span className="font-bold">Solution:</span> Allow guest browsing. Gate registration only at checkout.</p>
                </div>
              </div>

              {/* FRICTION POINT 2: Search Failure */}
              <div className="border-2 border-orange-400 rounded-lg p-6 bg-orange-50">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-2xl font-bold text-orange-800">2️⃣ Search Failure - HIGH IMPACT</h3>
                  <span className="text-5xl font-bold text-orange-600">{heatmapData.searchPage}%</span>
                </div>
                <p className="text-orange-700 mb-3"><span className="font-bold">Problem:</span> {100 - heatmapData.searchPage}% bounce when "0 results" shown</p>
                <div className="bg-orange-200 p-4 rounded-lg mb-3">
                  <p className="text-orange-900 text-sm"><span className="font-bold">Solution:</span> Implement category suggestions & related searches (we've added this!)</p>
                </div>
              </div>

              {/* FRICTION POINT 3: Payment Delay */}
              <div className="border-2 border-yellow-400 rounded-lg p-6 bg-yellow-50">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-2xl font-bold text-yellow-800">3️⃣ Payment Delay - MEDIUM IMPACT</h3>
                  <span className="text-5xl font-bold text-yellow-600">{heatmapData.checkout}%</span>
                </div>
                <p className="text-yellow-700 mb-3"><span className="font-bold">Problem:</span> {100 - heatmapData.checkout}% cart abandonment due to slow checkout</p>
                <div className="bg-yellow-200 p-4 rounded-lg mb-3">
                  <p className="text-yellow-900 text-sm"><span className="font-bold">Solution:</span> Optimize checkout for mobile. Stripe integration. 1-click payments.</p>
                </div>
              </div>

              {/* Buyer Journey Engagement */}
              <div className="grid grid-cols-5 gap-4 mt-8">
                <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                  <p className="text-3xl font-bold text-blue-700">{heatmapData.searchPage}%</p>
                  <p className="text-gray-700 text-sm font-semibold">Browse Page</p>
                  <p className="text-xs text-gray-600 mt-1">Discovery</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                  <p className="text-3xl font-bold text-blue-700">{heatmapData.productDetail}%</p>
                  <p className="text-gray-700 text-sm font-semibold">Product Detail</p>
                  <p className="text-xs text-gray-600 mt-1">Evaluation</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-300">
                  <p className="text-3xl font-bold text-green-700">{heatmapData.checkout}%</p>
                  <p className="text-gray-700 text-sm font-semibold">Checkout</p>
                  <p className="text-xs text-gray-600 mt-1">Transaction</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-300">
                  <p className="text-3xl font-bold text-green-700">88%</p>
                  <p className="text-gray-700 text-sm font-semibold">Order Placed</p>
                  <p className="text-xs text-gray-600 mt-1">Delivery</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
                  <p className="text-3xl font-bold text-purple-700">{heatmapData.review}%</p>
                  <p className="text-gray-700 text-sm font-semibold">Left Review</p>
                  <p className="text-xs text-gray-600 mt-1">Advocacy</p>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600 mt-8">
                <h3 className="font-bold text-blue-900 mb-3">🎯 Optimization Recommendations:</h3>
                <ul className="space-y-2 text-blue-900">
                  <li>✅ Reduce registration wall friction - currently losing {100 - heatmapData.registration}% potential users</li>
                  <li>✅ Implement smart category suggestions for "0 results" searches</li>
                  <li>✅ Optimize mobile checkout experience - test payment flow</li>
                  <li>✅ Create review incentive program - only {heatmapData.review}% leaving reviews</li>
                  <li>✅ A/B test product detail page layouts</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        {userRole === 'admin' && activeTab === 'escrow-monitor' && (
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold mb-6 text-blue-800">Escrow Health Monitor</h2>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-lg">
                <p className="text-sm opacity-90">Total Value Locked (TVL)</p>
                <p className="text-4xl font-bold">R{transactions.reduce((sum, t) => sum + (t.escrowAmount || 0), 0).toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 text-white p-6 rounded-lg">
                <p className="text-sm opacity-90">Escrow Held</p>
                <p className="text-4xl font-bold">{transactions.filter(t => t.escrowStatus === 'HELD').length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-lg">
                <p className="text-sm opacity-90">Released</p>
                <p className="text-4xl font-bold">{transactions.filter(t => t.escrowStatus === 'RELEASED').length}</p>
              </div>
            </div>

            <h3 className="text-2xl font-bold mb-4 text-gray-800">Active Transactions</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold">Transaction ID</th>
                    <th className="px-6 py-3 text-left font-bold">Service</th>
                    <th className="px-6 py-3 text-left font-bold">Amount</th>
                    <th className="px-6 py-3 text-left font-bold">Escrow Status</th>
                    <th className="px-6 py-3 text-left font-bold">Sign-off Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(txn => (
                    <tr key={txn.transactionId} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-mono">{txn.transactionId}</td>
                      <td className="px-6 py-3">{txn.doctorName}</td>
                      <td className="px-6 py-3 font-bold">R{txn.escrowAmount}</td>
                      <td className="px-6 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${txn.escrowStatus === 'HELD' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {txn.escrowStatus}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${txn.status.includes('Pending') ? 'bg-gray-100 text-gray-800' : txn.status.includes('Released') ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ USER PROFILE ============ */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-6 pb-10">
            {/* Profile Form */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-3xl shadow-xl border-2 border-indigo-300">
              <h2 className="text-3xl font-black mb-6 text-gray-900">👤 My Profile</h2>
              
              {profileMessage && (
                <div className={`mb-6 p-4 rounded-xl font-bold ${profileMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {profileMessage}
                </div>
              )}

              {editingProfile ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Full Name *</label>
                    <input 
                      type="text"
                      value={userProfile.fullName}
                      onChange={(e) => setUserProfile({...userProfile, fullName: e.target.value})}
                      className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-600"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Email Address *</label>
                    <input 
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                      className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-600"
                      placeholder="your.email@aeromarket.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Phone Number *</label>
                    <input 
                      type="tel"
                      value={userProfile.phone}
                      onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                      className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-600"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Company</label>
                    <input 
                      type="text"
                      value={userProfile.company}
                      onChange={(e) => setUserProfile({...userProfile, company: e.target.value})}
                      className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-600"
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Position</label>
                    <input 
                      type="text"
                      value={userProfile.position}
                      onChange={(e) => setUserProfile({...userProfile, position: e.target.value})}
                      className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-600"
                      placeholder="Your job title"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={saveProfile} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-black hover:from-indigo-700 hover:to-purple-700 transition transform hover:scale-105">
                      ✓ Save Profile
                    </button>
                    <button onClick={() => setEditingProfile(false)} className="flex-1 bg-gray-400 text-white py-3 rounded-lg font-black hover:bg-gray-500 transition">
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
                    <p className="text-sm text-gray-600 font-semibold">Full Name</p>
                    <p className="text-xl font-black text-gray-900">{userProfile.fullName || 'Not set'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
                    <p className="text-sm text-gray-600 font-semibold">Email</p>
                    <p className="text-lg font-bold text-gray-900">{userProfile.email}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
                    <p className="text-sm text-gray-600 font-semibold">Phone</p>
                    <p className="text-lg font-bold text-gray-900">{userProfile.phone || 'Not set'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
                    <p className="text-sm text-gray-600 font-semibold">Company</p>
                    <p className="text-lg font-bold text-gray-900">{userProfile.company || 'Not set'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
                    <p className="text-sm text-gray-600 font-semibold">Position</p>
                    <p className="text-lg font-bold text-gray-900">{userProfile.position || 'Not set'}</p>
                  </div>
                  <button onClick={() => setEditingProfile(true)} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-black hover:from-indigo-700 hover:to-purple-700 transition transform hover:scale-105 mt-6">
                    ✏️ Edit Profile
                  </button>
                </div>
              )}
            </div>

            {/* Profile Stats */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-6 rounded-2xl border-2 border-green-400">
                <p className="text-sm font-black text-green-700 mb-2">DOCUMENTS UPLOADED</p>
                <p className="text-5xl font-black text-green-900">{complianceDocuments.length}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-6 rounded-2xl border-2 border-blue-400">
                <p className="text-sm font-black text-blue-700 mb-2">ORDERS COMPLETED</p>
                <p className="text-5xl font-black text-blue-900">{orders.length}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-100 to-orange-100 p-6 rounded-2xl border-2 border-yellow-400">
                <p className="text-sm font-black text-yellow-700 mb-2">ITEMS IN CART</p>
                <p className="text-5xl font-black text-yellow-900">{cart.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-6 rounded-2xl border-2 border-purple-400">
                <p className="text-sm font-black text-purple-700 mb-2">REVIEWS WRITTEN</p>
                <p className="text-5xl font-black text-purple-900">{reviews.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* ============ COMPLIANCE DOCUMENTS ============ */}
        {activeTab === 'documents' && (
          <div className="space-y-8 px-6 pb-10">
            <h2 className="text-4xl font-black text-white mb-4">📄 Compliance Documents & Licenses</h2>

            {/* Upload Section */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-8 rounded-3xl shadow-xl border-4 border-orange-300">
              <h3 className="text-2xl font-black text-white mb-4">📤 Upload License or Compliance Document</h3>
              
              {uploadMessage && (
                <div className={`mb-6 p-4 rounded-xl font-bold text-white ${uploadMessage.includes('✅') ? 'bg-green-600' : 'bg-red-600'}`}>
                  {uploadMessage}
                </div>
              )}

              <div className="bg-white bg-opacity-90 p-6 rounded-2xl">
                <div className="border-3 border-dashed border-orange-400 rounded-xl p-8 text-center hover:bg-orange-50 transition cursor-pointer">
                  <input 
                    type="file"
                    id="docUpload"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  />
                  <label htmlFor="docUpload" className="cursor-pointer block">
                    <p className="text-4xl mb-3">📎</p>
                    <p className="text-lg font-black text-gray-800 mb-2">Click to upload or drag & drop</p>
                    <p className="text-sm text-gray-600">PDF, PNG, JPG, DOC, DOCX (Max 10MB)</p>
                  </label>
                </div>
              </div>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-gray-200">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6">
                <h3 className="text-2xl font-black">📋 Your Uploaded Documents</h3>
              </div>

              {complianceDocuments.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-3xl mb-4">📁</p>
                  <p className="text-xl text-gray-600 font-semibold mb-4">No documents uploaded yet</p>
                  <p className="text-gray-500">Upload your licenses and compliance documents to get verified</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b-2 border-gray-300">
                      <tr>
                        <th className="px-6 py-4 text-left font-black text-gray-800">📄 Filename</th>
                        <th className="px-6 py-4 text-left font-black text-gray-800">📅 Upload Date</th>
                        <th className="px-6 py-4 text-left font-black text-gray-800">💾 Size</th>
                        <th className="px-6 py-4 text-left font-black text-gray-800">✅ Status</th>
                        <th className="px-6 py-4 text-center font-black text-gray-800">⚙️ Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complianceDocuments.map((doc, idx) => (
                        <tr key={doc.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            <a href={doc.base64} download={doc.fileName} className="text-blue-600 hover:underline">
                              📎 {doc.fileName}
                            </a>
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-semibold">{doc.uploadDate}</td>
                          <td className="px-6 py-4 text-gray-700 font-semibold">{doc.fileSize} MB</td>
                          <td className="px-6 py-4">
                            <span className={`px-4 py-2 rounded-full font-bold text-sm ${
                              doc.verificationStatus === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                              doc.verificationStatus === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {doc.verificationStatus === 'Pending Review' && '⏳'} {doc.verificationStatus === 'Verified' && '✅'} {doc.verificationStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => deleteDocument(doc.id)}
                              className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition transform hover:scale-105"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Document Requirements */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-8 rounded-3xl shadow-xl">
              <h3 className="text-2xl font-black mb-4">📋 Document Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <p className="font-black mb-2">🪪 License Types Accepted:</p>
                  <ul className="text-sm space-y-1 font-semibold">
                    <li>• Pilot License</li>
                    <li>• Maintenance Certificate</li>
                    <li>• Medical Certificate</li>
                    <li>• Air Operator Certificate</li>
                  </ul>
                </div>
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <p className="font-black mb-2">📄 Accepted File Formats:</p>
                  <ul className="text-sm space-y-1 font-semibold">
                    <li>• PDF Documents</li>
                    <li>• PNG/JPG Images</li>
                    <li>• MS Word Documents</li>
                    <li>• Max 10MB per file</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ JOB MARKET - PROFESSIONAL BROWSE JOBS ============ */}
        {userRole === 'patient' && activeTab === 'jobs' && (
          <div className="space-y-8 px-6 pb-10">
            {/* Job Search & Filter */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white p-10 rounded-3xl shadow-2xl border-4 border-emerald-300">
              <h2 className="text-4xl font-black mb-2">💼 Aviation Job Market</h2>
              <p className="text-green-100 mb-8 text-lg">Find your next role in aviation • Pilot • Engineering • Operations • Crew</p>
              
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search by job title, company, or location..."
                    value={jobSearchQuery}
                    onChange={(e) => setJobSearchQuery(e.target.value)}
                    className="w-full p-4 rounded-full text-gray-900 text-lg font-semibold placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-green-300 shadow-lg"
                  />
                  <span className="absolute right-4 top-4 text-gray-400">🔍</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['Pilot', 'Engineering', 'Crew', 'Operations', 'Management'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setJobFilterCategory(jobFilterCategory === cat ? '' : cat)}
                      className={`p-3 rounded-xl font-bold text-sm transition transform hover:scale-105 ${jobFilterCategory === cat ? 'bg-white text-emerald-600 shadow-lg' : 'bg-emerald-700 text-white hover:bg-emerald-600'}`}
                    >
                      {cat === 'Pilot' && '👨‍✈️'} {cat === 'Engineering' && '🔧'} {cat === 'Crew' && '👥'} {cat === 'Operations' && '📊'} {cat === 'Management' && '👔'} {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Header */}
            <div className="bg-white bg-opacity-10 backdrop-blur-md px-6 py-4 rounded-2xl border border-green-300 flex justify-between items-center">
              <h3 className="text-3xl font-black text-white">✨ {filteredJobs.length} Jobs Found</h3>
              <span className="text-green-200 animate-pulse">Hiring Now</span>
            </div>

            {/* Jobs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredJobs.map((job, idx) => (
                <div 
                  key={job.id}
                  className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
                  onClick={() => setSelectedJob(job)}
                  style={{animation: `fadeIn 0.5s ease-out ${idx * 0.05}s both`}}
                >
                  <div className={`rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all border-3 h-full flex flex-col ${job.verified ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400' : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-400'}`}>
                    <div className={`p-6 flex-1 flex flex-col ${job.verified ? 'bg-gradient-to-br from-green-100 to-emerald-50' : 'bg-gradient-to-br from-blue-100 to-cyan-50'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-black text-xl text-gray-900 group-hover:text-emerald-600 transition">{job.title}</h3>
                          <p className="text-sm text-gray-700 font-semibold mt-1">🏢 {job.company}</p>
                        </div>
                        {job.verified && <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg">✅ ACTIVE</span>}
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-gray-700 font-semibold">📍 {job.location}</p>
                        <p className="text-lg font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{job.salary}</p>
                        <p className="text-sm text-gray-600 font-semibold">⏱️ Experience: {job.experience}</p>
                      </div>
                      
                      <div className="flex gap-2 mb-4 flex-wrap">
                        <span className="bg-green-200 text-green-900 px-3 py-1 rounded-full text-xs font-bold">{job.jobType}</span>
                        <span className="bg-blue-200 text-blue-900 px-3 py-1 rounded-full text-xs font-bold">{job.category}</span>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-300">
                        <p className="text-xs text-gray-600 font-semibold mb-3">👥 {job.applicants} applicants • {job.postedDate}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-white bg-opacity-70 group-hover:bg-opacity-100 transition flex gap-2">
                      <button className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-black py-2 rounded-lg hover:from-emerald-600 hover:to-green-600 transition transform hover:scale-105">
                        View →
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); saveJob(job); }} className={`px-4 py-2 rounded-lg font-bold transition ${savedJobs.some(j => j.id === job.id) ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                        ❤️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Job Detail Modal */}
            {selectedJob && (
              <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedJob(null)}>
                <div className="bg-gradient-to-br from-white to-green-50 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border-4 border-emerald-500 transform animate-in scale-95" onClick={(e) => e.stopPropagation()}>
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-4xl font-black text-gray-900">{selectedJob.title}</h2>
                        <p className="text-gray-600 mt-2 text-lg">🏢 {selectedJob.company}</p>
                      </div>
                      <button onClick={() => setSelectedJob(null)} className="text-3xl text-gray-400 hover:text-red-600 transition transform hover:scale-110">✕</button>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 rounded-2xl mb-6 text-white">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-green-100 text-sm font-semibold">Location</p>
                          <p className="text-2xl font-black">📍 {selectedJob.location}</p>
                        </div>
                        <div>
                          <p className="text-green-100 text-sm font-semibold">Job Type</p>
                          <p className="text-2xl font-black">{selectedJob.jobType}</p>
                        </div>
                      </div>
                      <div className="border-t-2 border-green-300 pt-4">
                        <p className="text-sm text-green-100 mb-1">Salary Range</p>
                        <p className="text-5xl font-black">{selectedJob.salary}</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-2xl mb-6 border-2 border-blue-400">
                      <h3 className="font-black text-gray-800 mb-3 text-lg">📋 Job Description</h3>
                      <p className="text-gray-700 font-semibold mb-4">{selectedJob.description}</p>
                      <p className="text-sm text-gray-600"><span className="font-black">Experience Required:</span> {selectedJob.experience}</p>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-2xl mb-6 border-2 border-yellow-400">
                      <p className="text-sm font-black text-yellow-700 mb-2">📊 Application Stats</p>
                      <p className="text-3xl font-black text-yellow-900">{selectedJob.applicants}</p>
                      <p className="text-gray-600 font-semibold">People have already applied</p>
                    </div>

                    <div className="space-y-3">
                      <button 
                        onClick={() => {
                          applyForJob(selectedJob);
                        }}
                        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-4 rounded-xl font-black text-lg hover:from-emerald-700 hover:to-green-700 transition transform hover:scale-105 shadow-lg"
                      >
                        ✉️ Apply Now
                      </button>
                      <button 
                        onClick={() => saveJob(selectedJob)}
                        className={`w-full py-3 rounded-xl font-bold transition ${savedJobs.some(j => j.id === selectedJob.id) ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                      >
                        {savedJobs.some(j => j.id === selectedJob.id) ? '❤️ Saved' : '🤍 Save for Later'}
                      </button>
                      <button 
                        onClick={() => setSelectedJob(null)}
                        className="w-full bg-gray-400 text-white py-3 rounded-xl font-bold hover:bg-gray-500 transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* My Applications Section */}
            {appliedJobs.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-gray-200 mt-8">
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6">
                  <h3 className="text-2xl font-black">📤 My Job Applications ({appliedJobs.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b-2 border-gray-300">
                      <tr>
                        <th className="px-6 py-4 text-left font-black text-gray-800">Job Title</th>
                        <th className="px-6 py-4 text-left font-black text-gray-800">Company</th>
                        <th className="px-6 py-4 text-left font-black text-gray-800">Applied Date</th>
                        <th className="px-6 py-4 text-left font-black text-gray-800">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appliedJobs.map((app, idx) => (
                        <tr key={app.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <td className="px-6 py-4 font-semibold text-gray-900">{app.jobTitle}</td>
                          <td className="px-6 py-4 text-gray-700 font-semibold">{app.company}</td>
                          <td className="px-6 py-4 text-gray-700 font-semibold">{app.appliedDate}</td>
                          <td className="px-6 py-4">
                            <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold text-sm">⏳ {app.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ JOB MARKET - EMPLOYER POST JOBS ============ */}
        {userRole === 'seller' && activeTab === 'jobs-employer' && (
          <div className="space-y-8 px-6 pb-10">
            <h2 className="text-4xl font-black text-white mb-4">💼 Post Aviation Jobs</h2>

            {/* Post Job Form */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-8 rounded-3xl shadow-xl border-4 border-emerald-300">
              <h3 className="text-2xl font-black text-white mb-4">📝 Create New Job Listing</h3>
              
              {jobPostingMessage && (
                <div className={`mb-6 p-4 rounded-xl font-bold text-white ${jobPostingMessage.includes('✅') ? 'bg-green-600' : 'bg-red-600'}`}>
                  {jobPostingMessage}
                </div>
              )}

              <form onSubmit={postNewJob} className="space-y-4 bg-white bg-opacity-95 p-6 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Job Title *</label>
                    <input 
                      type="text"
                      value={newJobPosting.title}
                      onChange={(e) => setNewJobPosting({...newJobPosting, title: e.target.value})}
                      className="w-full p-3 border-2 border-emerald-300 rounded-lg focus:outline-none focus:border-emerald-600"
                      placeholder="e.g., Commercial Pilot"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Company Name *</label>
                    <input 
                      type="text"
                      value={newJobPosting.company}
                      onChange={(e) => setNewJobPosting({...newJobPosting, company: e.target.value})}
                      className="w-full p-3 border-2 border-emerald-300 rounded-lg focus:outline-none focus:border-emerald-600"
                      placeholder="Your company"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Location *</label>
                    <input 
                      type="text"
                      value={newJobPosting.location}
                      onChange={(e) => setNewJobPosting({...newJobPosting, location: e.target.value})}
                      className="w-full p-3 border-2 border-emerald-300 rounded-lg focus:outline-none focus:border-emerald-600"
                      placeholder="e.g., Johannesburg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Salary Range *</label>
                    <input 
                      type="text"
                      value={newJobPosting.salary}
                      onChange={(e) => setNewJobPosting({...newJobPosting, salary: e.target.value})}
                      className="w-full p-3 border-2 border-emerald-300 rounded-lg focus:outline-none focus:border-emerald-600"
                      placeholder="e.g., R450,000 - R650,000/year"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Experience Required</label>
                    <input 
                      type="text"
                      value={newJobPosting.experience}
                      onChange={(e) => setNewJobPosting({...newJobPosting, experience: e.target.value})}
                      className="w-full p-3 border-2 border-emerald-300 rounded-lg focus:outline-none focus:border-emerald-600"
                      placeholder="e.g., 1,500+ hours"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Job Type</label>
                    <select 
                      value={newJobPosting.jobType}
                      onChange={(e) => setNewJobPosting({...newJobPosting, jobType: e.target.value})}
                      className="w-full p-3 border-2 border-emerald-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value="">Select...</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Temporary">Temporary</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">Job Description</label>
                  <textarea 
                    value={newJobPosting.description}
                    onChange={(e) => setNewJobPosting({...newJobPosting, description: e.target.value})}
                    className="w-full p-3 border-2 border-emerald-300 rounded-lg focus:outline-none focus:border-emerald-600 h-24"
                    placeholder="Describe the role, responsibilities, and requirements..."
                  ></textarea>
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-lg font-black text-lg hover:from-emerald-700 hover:to-green-700 transition transform hover:scale-105">
                  ✓ Post Job Opening
                </button>
              </form>
            </div>

            {/* Posted Jobs */}
            {postedJobs.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-gray-200">
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6">
                  <h3 className="text-2xl font-black">📋 Your Job Postings ({postedJobs.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b-2 border-gray-300">
                      <tr>
                        <th className="px-6 py-4 text-left font-black text-gray-800">Job Title</th>
                        <th className="px-6 py-4 text-left font-black text-gray-800">Location</th>
                        <th className="px-6 py-4 text-left font-black text-gray-800">Applicants</th>
                        <th className="px-6 py-4 text-left font-black text-gray-800">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {postedJobs.map((job, idx) => (
                        <tr key={job.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <td className="px-6 py-4 font-semibold text-gray-900">{job.title}</td>
                          <td className="px-6 py-4 text-gray-700 font-semibold">{job.location}</td>
                          <td className="px-6 py-4">
                            <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold">0 applications</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold text-sm">⏳ Pending Review</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ DEFAULT MESSAGE ============ */}
        {!['browse', 'cart', 'orders', 'reviews', 'transactions', 'jobs', 'profile', 'documents', 'seller-dashboard', 'seller-listings', 'seller-orders', 'seller-payouts', 'jobs-employer', 'admin-overview', 'admin-heatmap', 'fraud-detection', 'disputes'].includes(activeTab) && (
          <div className="bg-white p-12 rounded-2xl shadow-xl text-center">
            <p className="text-2xl text-gray-600">Select a tab above to explore the marketplace</p>
          </div>
        )}
      </div>
    )}

      </div>
    </div>
  );
}