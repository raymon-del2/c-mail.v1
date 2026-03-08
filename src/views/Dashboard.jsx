import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Mail, Inbox, Send, File, Settings as SettingsIcon, LogOut, Search, Menu, ChevronLeft, X, Edit2, ArrowRight, CheckCircle2, Copy, Check, AlertTriangle, RotateCcw, Trash2, Code2, Globe, Lock, CornerDownRight, Eye, EyeOff, Terminal, Plus, Shield, Megaphone, Phone } from 'lucide-react';
import './Dashboard.css';
import './DashboardMobile.css';
import './Compose.css';
import './DevApi.css';

const HighlightText = ({ text, highlight }) => {
  if (!highlight.trim()) return <>{text}</>;
  
  // Escape special regex characters in the highlight string
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <span key={index} className="cmail-highlight">{part}</span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

export default function Dashboard() {
  const { username } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('cmail_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  // Get folder from URL path on initial load
  const getFolderFromPath = useCallback(() => {
    const pathParts = location.pathname.split('/');
    const folder = pathParts[2]; // /username/folder
    const validFolders = ['inbox', 'sent', 'drafts', 'devapi', 'connected-apps', 'admin-news'];
    return validFolders.includes(folder) ? folder : 'inbox';
  }, [location.pathname]);
  
  const [activeFolder, setActiveFolder] = useState(getFolderFromPath);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Email states
  const [emails, setEmails] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeLinks, setComposeLinks] = useState([]);
  const [toast, setToast] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState(null);
  const [recipientSearch, setRecipientSearch] = useState(null);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [recipientError, setRecipientError] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = React.useRef(null);

  // Reply states
  const [isReplying, setIsReplying] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyLinks, setReplyLinks] = useState([]);
  const [emailThread, setEmailThread] = useState([]);
  const [foldedMessages, setFoldedMessages] = useState(true); // true = intermediate messages collapsed

  // Developer API state
  const [apiKey, setApiKey] = useState(null);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [apiKeyJustGenerated, setApiKeyJustGenerated] = useState(false);
  const [redirectUrlInput, setRedirectUrlInput] = useState('');
  const [redirectUrls, setRedirectUrls] = useState([]);
  const [urlSaved, setUrlSaved] = useState(false);
  const [devApiTab, setDevApiTab] = useState('nextjs'); // 'nextjs', 'curl', or 'email'
  const [connectedApps, setConnectedApps] = useState([]);
  const [verifiedUrls, setVerifiedUrls] = useState(new Set());
  const [adminNews, setAdminNews] = useState([]);
  const [newsInput, setNewsInput] = useState({ title: '', content: '' });
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [allNews, setAllNews] = useState([]); // For all users to see
  const [showNewsModal, setShowNewsModal] = useState(false); // View all admin announcements
  const [readNewsIds, setReadNewsIds] = useState(() => {
    // Load read news from localStorage
    const saved = localStorage.getItem('cmail_read_news');
    return saved ? JSON.parse(saved) : [];
  }); // Track which news items user has read

  // Phone number notification state
  const [showPhonePopup, setShowPhonePopup] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState('+254');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // All country codes data
  const countryCodes = [
    { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
    { code: '+7', country: 'Russia/Kazakhstan', flag: '🇷🇺' },
    { code: '+20', country: 'Egypt', flag: '🇪🇬' },
    { code: '+27', country: 'South Africa', flag: '🇿🇦' },
    { code: '+30', country: 'Greece', flag: '🇬🇷' },
    { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
    { code: '+32', country: 'Belgium', flag: '🇧🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+34', country: 'Spain', flag: '🇪🇸' },
    { code: '+36', country: 'Hungary', flag: '🇭🇺' },
    { code: '+39', country: 'Italy', flag: '🇮🇹' },
    { code: '+40', country: 'Romania', flag: '🇷🇴' },
    { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
    { code: '+43', country: 'Austria', flag: '🇦🇹' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+45', country: 'Denmark', flag: '🇩🇰' },
    { code: '+46', country: 'Sweden', flag: '🇸🇪' },
    { code: '+47', country: 'Norway', flag: '🇳🇴' },
    { code: '+48', country: 'Poland', flag: '🇵🇱' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+51', country: 'Peru', flag: '🇵🇪' },
    { code: '+52', country: 'Mexico', flag: '🇲🇽' },
    { code: '+53', country: 'Cuba', flag: '🇨🇺' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
    { code: '+63', country: 'Philippines', flag: '🇵🇭' },
    { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+66', country: 'Thailand', flag: '🇹🇭' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷' },
    { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+90', country: 'Turkey', flag: '🇹🇷' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
    { code: '+93', country: 'Afghanistan', flag: '🇦🇫' },
    { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+95', country: 'Myanmar', flag: '🇲🇲' },
    { code: '+98', country: 'Iran', flag: '🇮🇷' },
    { code: '+211', country: 'South Sudan', flag: '🇸🇸' },
    { code: '+212', country: 'Morocco', flag: '🇲🇦' },
    { code: '+213', country: 'Algeria', flag: '🇩🇿' },
    { code: '+216', country: 'Tunisia', flag: '🇹🇳' },
    { code: '+218', country: 'Libya', flag: '🇱🇾' },
    { code: '+220', country: 'Gambia', flag: '🇬🇲' },
    { code: '+221', country: 'Senegal', flag: '🇸🇳' },
    { code: '+222', country: 'Mauritania', flag: '🇲🇷' },
    { code: '+223', country: 'Mali', flag: '🇲🇱' },
    { code: '+224', country: 'Guinea', flag: '🇬🇳' },
    { code: '+225', country: 'Ivory Coast', flag: '🇨🇮' },
    { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
    { code: '+227', country: 'Niger', flag: '🇳🇪' },
    { code: '+228', country: 'Togo', flag: '🇹🇬' },
    { code: '+229', country: 'Benin', flag: '🇧🇯' },
    { code: '+230', country: 'Mauritius', flag: '🇲🇺' },
    { code: '+231', country: 'Liberia', flag: '🇱🇷' },
    { code: '+232', country: 'Sierra Leone', flag: '🇸🇱' },
    { code: '+233', country: 'Ghana', flag: '🇬🇭' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
    { code: '+235', country: 'Chad', flag: '🇹🇩' },
    { code: '+236', country: 'Central African Rep', flag: '🇨🇫' },
    { code: '+237', country: 'Cameroon', flag: '🇨🇲' },
    { code: '+238', country: 'Cape Verde', flag: '🇨🇻' },
    { code: '+239', country: 'Sao Tome', flag: '🇸🇹' },
    { code: '+240', country: 'Equatorial Guinea', flag: '🇬🇶' },
    { code: '+241', country: 'Gabon', flag: '🇬🇦' },
    { code: '+242', country: 'Congo', flag: '🇨🇬' },
    { code: '+243', country: 'DR Congo', flag: '🇨🇩' },
    { code: '+244', country: 'Angola', flag: '🇦🇴' },
    { code: '+245', country: 'Guinea-Bissau', flag: '🇬🇼' },
    { code: '+246', country: 'Diego Garcia', flag: '🇮🇴' },
    { code: '+247', country: 'Ascension', flag: '🇸🇭' },
    { code: '+248', country: 'Seychelles', flag: '🇸🇨' },
    { code: '+249', country: 'Sudan', flag: '🇸🇩' },
    { code: '+250', country: 'Rwanda', flag: '🇷🇼' },
    { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
    { code: '+252', country: 'Somalia', flag: '🇸🇴' },
    { code: '+253', country: 'Djibouti', flag: '🇩🇯' },
    { code: '+254', country: 'Kenya', flag: '🇰🇪' },
    { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
    { code: '+256', country: 'Uganda', flag: '🇺🇬' },
    { code: '+257', country: 'Burundi', flag: '🇧🇮' },
    { code: '+258', country: 'Mozambique', flag: '🇲🇿' },
    { code: '+260', country: 'Zambia', flag: '🇿🇲' },
    { code: '+261', country: 'Madagascar', flag: '🇲🇬' },
    { code: '+262', country: 'Reunion', flag: '🇷🇪' },
    { code: '+263', country: 'Zimbabwe', flag: '🇿🇼' },
    { code: '+264', country: 'Namibia', flag: '🇳🇦' },
    { code: '+265', country: 'Malawi', flag: '🇲🇼' },
    { code: '+266', country: 'Lesotho', flag: '🇱🇸' },
    { code: '+267', country: 'Botswana', flag: '🇧🇼' },
    { code: '+268', country: 'Eswatini', flag: '🇸🇿' },
    { code: '+269', country: 'Comoros', flag: '🇰🇲' },
    { code: '+290', country: 'St Helena', flag: '🇸🇭' },
    { code: '+291', country: 'Eritrea', flag: '🇪🇷' },
    { code: '+297', country: 'Aruba', flag: '🇦🇼' },
    { code: '+298', country: 'Faroe Islands', flag: '🇫🇴' },
    { code: '+299', country: 'Greenland', flag: '🇬🇱' },
    { code: '+350', country: 'Gibraltar', flag: '🇬🇮' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+352', country: 'Luxembourg', flag: '🇱🇺' },
    { code: '+353', country: 'Ireland', flag: '🇮🇪' },
    { code: '+354', country: 'Iceland', flag: '🇮🇸' },
    { code: '+355', country: 'Albania', flag: '🇦🇱' },
    { code: '+356', country: 'Malta', flag: '🇲🇹' },
    { code: '+357', country: 'Cyprus', flag: '🇨🇾' },
    { code: '+358', country: 'Finland', flag: '🇫🇮' },
    { code: '+359', country: 'Bulgaria', flag: '🇧🇬' },
    { code: '+370', country: 'Lithuania', flag: '🇱🇹' },
    { code: '+371', country: 'Latvia', flag: '🇱🇻' },
    { code: '+372', country: 'Estonia', flag: '🇪🇪' },
    { code: '+373', country: 'Moldova', flag: '🇲🇩' },
    { code: '+374', country: 'Armenia', flag: '🇦🇲' },
    { code: '+375', country: 'Belarus', flag: '🇧🇾' },
    { code: '+376', country: 'Andorra', flag: '🇦🇩' },
    { code: '+377', country: 'Monaco', flag: '🇲🇨' },
    { code: '+378', country: 'San Marino', flag: '🇸🇲' },
    { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
    { code: '+381', country: 'Serbia', flag: '🇷🇸' },
    { code: '+382', country: 'Montenegro', flag: '🇲🇪' },
    { code: '+383', country: 'Kosovo', flag: '🇽🇰' },
    { code: '+385', country: 'Croatia', flag: '🇭🇷' },
    { code: '+386', country: 'Slovenia', flag: '🇸🇮' },
    { code: '+387', country: 'Bosnia', flag: '🇧🇦' },
    { code: '+389', country: 'North Macedonia', flag: '🇲🇰' },
    { code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
    { code: '+421', country: 'Slovakia', flag: '🇸🇰' },
    { code: '+423', country: 'Liechtenstein', flag: '🇱🇮' },
    { code: '+500', country: 'Falkland Islands', flag: '🇫🇰' },
    { code: '+501', country: 'Belize', flag: '🇧🇿' },
    { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
    { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
    { code: '+504', country: 'Honduras', flag: '🇭🇳' },
    { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
    { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
    { code: '+507', country: 'Panama', flag: '🇵🇦' },
    { code: '+508', country: 'St Pierre', flag: '🇵🇲' },
    { code: '+509', country: 'Haiti', flag: '🇭🇹' },
    { code: '+590', country: 'Guadeloupe', flag: '🇬🇵' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
    { code: '+592', country: 'Guyana', flag: '🇬🇾' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    { code: '+594', country: 'French Guiana', flag: '🇬🇫' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
    { code: '+596', country: 'Martinique', flag: '🇲🇶' },
    { code: '+597', country: 'Suriname', flag: '🇸🇷' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
    { code: '+599', country: 'Curacao', flag: '🇨🇼' },
    { code: '+670', country: 'East Timor', flag: '🇹🇱' },
    { code: '+672', country: 'Antarctica', flag: '🇦🇶' },
    { code: '+673', country: 'Brunei', flag: '🇧🇳' },
    { code: '+674', country: 'Nauru', flag: '🇳🇷' },
    { code: '+675', country: 'Papua New Guinea', flag: '🇵🇬' },
    { code: '+676', country: 'Tonga', flag: '🇹🇴' },
    { code: '+677', country: 'Solomon Islands', flag: '🇸🇧' },
    { code: '+678', country: 'Vanuatu', flag: '🇻🇺' },
    { code: '+679', country: 'Fiji', flag: '🇫🇯' },
    { code: '+680', country: 'Palau', flag: '🇵🇼' },
    { code: '+681', country: 'Wallis', flag: '🇼🇫' },
    { code: '+682', country: 'Cook Islands', flag: '🇨🇰' },
    { code: '+683', country: 'Niue', flag: '🇳🇺' },
    { code: '+684', country: 'Samoa', flag: '🇼🇸' },
    { code: '+685', country: 'Samoa', flag: '🇼🇸' },
    { code: '+686', country: 'Kiribati', flag: '🇰🇮' },
    { code: '+687', country: 'New Caledonia', flag: '🇳🇨' },
    { code: '+688', country: 'Tuvalu', flag: '🇹🇻' },
    { code: '+689', country: 'French Polynesia', flag: '🇵🇫' },
    { code: '+690', country: 'Tokelau', flag: '🇹🇰' },
    { code: '+691', country: 'Micronesia', flag: '🇫🇲' },
    { code: '+692', country: 'Marshall Islands', flag: '🇲🇭' },
    { code: '+850', country: 'North Korea', flag: '🇰🇵' },
    { code: '+852', country: 'Hong Kong', flag: '🇭🇰' },
    { code: '+853', country: 'Macau', flag: '🇲🇴' },
    { code: '+855', country: 'Cambodia', flag: '🇰🇭' },
    { code: '+856', country: 'Laos', flag: '🇱🇦' },
    { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
    { code: '+886', country: 'Taiwan', flag: '🇹🇼' },
    { code: '+960', country: 'Maldives', flag: '🇲🇻' },
    { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
    { code: '+962', country: 'Jordan', flag: '🇯🇴' },
    { code: '+963', country: 'Syria', flag: '🇸🇾' },
    { code: '+964', country: 'Iraq', flag: '🇮🇶' },
    { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+967', country: 'Yemen', flag: '🇾🇪' },
    { code: '+968', country: 'Oman', flag: '🇴🇲' },
    { code: '+970', country: 'Palestine', flag: '🇵🇸' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+972', country: 'Israel', flag: '🇮🇱' },
    { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
    { code: '+974', country: 'Qatar', flag: '🇶🇦' },
    { code: '+975', country: 'Bhutan', flag: '🇧🇹' },
    { code: '+976', country: 'Mongolia', flag: '🇲🇳' },
    { code: '+977', country: 'Nepal', flag: '🇳🇵' },
    { code: '+992', country: 'Tajikistan', flag: '🇹🇯' },
    { code: '+993', country: 'Turkmenistan', flag: '🇹🇲' },
    { code: '+994', country: 'Azerbaijan', flag: '🇦🇿' },
    { code: '+995', country: 'Georgia', flag: '🇬🇪' },
    { code: '+996', country: 'Kyrgyzstan', flag: '🇰🇬' },
    { code: '+998', country: 'Uzbekistan', flag: '🇺🇿' },
  ];

  // Admin check - only playraofficial is admin
  const isAdmin = user?.username === 'playraofficial' || user?.email === 'playraofficial@c-mail.vercel.app';

  const verificationToken = `cmail-verify-${user?._id?.slice(-8) || 'token-xyz-123'}`;

  // Sync activeFolder with URL changes (browser back/forward)
  useEffect(() => {
    const folderFromPath = getFolderFromPath();
    if (folderFromPath !== activeFolder) {
      setActiveFolder(folderFromPath);
    }
  }, [location.pathname, activeFolder, getFolderFromPath]);

  // Auto-save draft functionality
  const [currentDraftId, setCurrentDraftId] = useState(null);
  
  // Load emails from backend
  const fetchEmails = useCallback(async (folderName, clearExisting = false, isInitial = false) => {
    if (!user?._id) return;
    
    // Set initial load state
    if (isInitial) {
      setIsInitialLoad(true);
      setHasInitialData(false);
    }
    
    // Clear emails if explicitly requested (folder change)
    if (clearExisting) {
      setEmails([]);
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/emails/${user._id}?folder=${folderName}`);
      
      // Handle 304 Not Modified - use cached data
      if (response.status === 304) {
        // Data hasn't changed, don't update state
        if (isInitial) {
          // For initial load, still mark as having data after 5 seconds
          setTimeout(() => {
            setIsInitialLoad(false);
            setHasInitialData(true);
          }, 5000);
        }
        return;
      }
      
      if (!response.ok) throw new Error('Failed to fetch emails');
      
      const data = await response.json();
      
      if (isInitial) {
        // Initial load - show loader for 5 seconds minimum
        setTimeout(() => {
          setEmails(data.map(email => ({
            id: email._id,
            sender: email.senderName || (email.folder === 'sent' ? `${user.firstName} ${user.secondName}` : email.sender?.firstName + ' ' + email.sender?.secondName),
            senderUsername: email.senderUsername || (email.folder === 'sent' ? user.username : email.sender?.username),
            senderId: email.sender?._id || email.sender || user._id,
            senderProfileUrl: email.folder === 'sent' ? user.profileUrl : email.sender?.profileUrl,
            recipient: email.recipientUsername,
            recipientId: email.recipient,
            subject: email.subject,
            preview: email.body.substring(0, 50) + (email.body.length > 50 ? '...' : ''),
            body: email.body,
            links: email.links || [],
            time: new Date(email.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: !email.read,
            folder: email.folder,
            isReply: email.isReply,
            replyCount: email.replyCount || 0,
            threadId: email.threadId,
            parentEmailId: email.parentEmailId
          })));
          setIsInitialLoad(false);
          setHasInitialData(true);
        }, 5000);
      } else {
        // Auto-refresh - append new emails without loader
        setEmails(prevEmails => {
          const newEmails = data.map(email => ({
            id: email._id,
            sender: email.senderName || (email.folder === 'sent' ? `${user.firstName} ${user.secondName}` : email.sender?.firstName + ' ' + email.sender?.secondName),
            senderUsername: email.senderUsername || (email.folder === 'sent' ? user.username : email.sender?.username),
            senderId: email.sender?._id || email.sender || user._id,
            senderProfileUrl: email.folder === 'sent' ? user.profileUrl : email.sender?.profileUrl,
            recipient: email.recipientUsername,
            recipientId: email.recipient,
            subject: email.subject,
            preview: email.body.substring(0, 50) + (email.body.length > 50 ? '...' : ''),
            body: email.body,
            links: email.links || [],
            time: new Date(email.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: !email.read,
            folder: email.folder,
            isReply: email.isReply,
            replyCount: email.replyCount || 0,
            threadId: email.threadId,
            parentEmailId: email.parentEmailId
          }));
          
          // Only add emails that don't already exist
          const existingIds = new Set(prevEmails.map(e => e.id));
          const uniqueNewEmails = newEmails.filter(e => !existingIds.has(e.id));
          
          return [...prevEmails, ...uniqueNewEmails];
        });
      }
    } catch (error) {
      console.error('Fetch emails error:', error);
      if (isInitial) {
        setTimeout(() => {
          setIsInitialLoad(false);
          setHasInitialData(true);
        }, 5000);
      }
    }
  }, [user]);

  // Load emails when folder changes or user logs in
  useEffect(() => {
    if (user && activeFolder !== 'devapi') {
      // Reset states and trigger initial load with 5-second minimum loader
      setIsInitialLoad(true);
      setHasInitialData(false);
      fetchEmails(activeFolder, true, true);
    }
  }, [user, activeFolder, fetchEmails]);

  // Auto-refresh emails every 10 seconds (without loader)
  useEffect(() => {
    if (!user || activeFolder === 'devapi' || !hasInitialData) return;
    
    const refreshInterval = setInterval(() => {
      fetchEmails(activeFolder, false, false);
    }, 10000);
    
    return () => clearInterval(refreshInterval);
  }, [user, activeFolder, hasInitialData, fetchEmails]);

  // Auto-save draft every 5 seconds when composing
  useEffect(() => {
    if (!isComposing || !user?._id) return;
    
    const autoSaveInterval = setInterval(async () => {
      if (composeTo.trim() || composeSubject.trim() || composeBody.trim()) {
        try {
          const response = await fetch('http://localhost:5000/api/emails/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: user._id,
              senderUsername: user.username,
              senderName: `${user.firstName} ${user.secondName}`,
              recipientId: recipientSearch?._id || null,
              recipientUsername: recipientSearch?.username || composeTo,
              subject: composeSubject,
              body: composeBody,
              links: composeLinks,
              draftId: currentDraftId
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.draft && !currentDraftId) {
              setCurrentDraftId(data.draft._id);
            }
          }
        } catch (error) {
          console.error('Auto-save error:', error);
        }
      }
    }, 5000);
    
    return () => clearInterval(autoSaveInterval);
  }, [isComposing, composeTo, composeSubject, composeBody, composeLinks, user, recipientSearch, currentDraftId]);

  const handleLogout = () => {
    localStorage.removeItem('cmail_user');
    navigate('/');
  };

  const fetchDevApiCredentials = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/devapi/${user._id}`);
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey);
        setRedirectUrls(data.redirectUrls);
      }
    } catch (error) {
      console.error('Fetch DevAPI credentials error:', error);
    }
  }, [user?._id]);

  const fetchConnectedApps = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/user/connected-apps/${user._id}`);
      if (response.ok) {
        const data = await response.json();
        setConnectedApps(data);
      }
    } catch (error) {
      console.error('Fetch connected apps error:', error);
    }
  }, [user?._id]);

  const checkVerificationStatus = useCallback(async (urls) => {
    try {
      const newVerified = new Set();
      await Promise.all(urls.map(async (url) => {
        const response = await fetch(`http://localhost:5000/api/devapi/verify-status/${user._id}?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.verified) {
            newVerified.add(url);
          }
        }
      }));
      setVerifiedUrls(newVerified);
    } catch (error) {
      console.error('Check verification status error:', error);
    }
  }, [user?._id]);

  const verifyDomain = async (url) => {
    try {
      const response = await fetch('http://localhost:5000/api/devapi/verify-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          url,
          expectedToken: verificationToken
        })
      });
      
      const data = await response.json();
      
      if (data.verified) {
        setVerifiedUrls(prev => new Set([...prev, url]));
        setToast('Domain verified successfully');
      } else {
        setToast(data.error || 'Verification failed');
      }
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      console.error('Verify domain error:', error);
      setToast('Failed to verify domain');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const revokeAppAccess = async (clientId) => {
    try {
      const response = await fetch('http://localhost:5000/api/user/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, clientId })
      });
      
      if (response.ok) {
        setConnectedApps(connectedApps.filter(app => app.clientId !== clientId));
        setToast('App access revoked');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Revoke access error:', error);
      setToast('Failed to revoke access');
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Refresh user data from database
  const refreshUserData = useCallback(async () => {
    if (!user?._id) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/user/${user._id}`);
      if (response.ok) {
        const updatedUser = await response.json();
        
        // Prevent infinite loop by only updating if data actually changed
        if (JSON.stringify(user) !== JSON.stringify(updatedUser)) {
          localStorage.setItem('cmail_user', JSON.stringify(updatedUser));
          // Update React state to trigger re-render
          setUser(updatedUser);
        }
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, [user]);

  // Load Dev API credentials and check verification status on mount
  useEffect(() => {
    if (user?._id && activeFolder === 'devapi') {
      fetchDevApiCredentials().then(() => {
        if (redirectUrls.length > 0) {
          checkVerificationStatus(redirectUrls);
        }
      });
    }
  }, [user, activeFolder, fetchDevApiCredentials, redirectUrls, checkVerificationStatus]);

  // Refresh user data on mount and when window gains focus
  useEffect(() => {
    refreshUserData();
    
    const handleFocus = () => {
      refreshUserData();
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUserData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?._id, refreshUserData]);

  // Load connected apps when folder changes
  useEffect(() => {
    if (user?._id && activeFolder === 'connected-apps') {
      fetchConnectedApps();
    }
  }, [user, activeFolder, fetchConnectedApps]);

  // Admin News functions
  const fetchNews = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/news/${user._id}`);
      if (response.ok) {
        const data = await response.json();
        setAdminNews(data);
      }
    } catch (error) {
      console.error('Fetch news error:', error);
    }
  }, [user?._id]);

  const createNews = async () => {
    if (!newsInput.title.trim() || !newsInput.content.trim()) {
      setToast('Title and content are required');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user._id,
          title: newsInput.title,
          content: newsInput.content
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAdminNews([data, ...adminNews]);
        setNewsInput({ title: '', content: '' });
        setToast('News published');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Create news error:', error);
      setToast('Failed to publish news');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const updateNews = async (newsId) => {
    if (!newsInput.title.trim() || !newsInput.content.trim()) {
      setToast('Title and content are required');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/news/${newsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user._id,
          title: newsInput.title,
          content: newsInput.content
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAdminNews(adminNews.map(n => n.id === newsId ? data : n));
        setNewsInput({ title: '', content: '' });
        setEditingNewsId(null);
        setToast('News updated');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Update news error:', error);
      setToast('Failed to update news');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const deleteNews = async (newsId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/news/${newsId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user._id })
      });
      
      if (response.ok) {
        setAdminNews(adminNews.filter(n => n.id !== newsId));
        setToast('News deleted');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Delete news error:', error);
      setToast('Failed to delete news');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const startEditNews = (news) => {
    setEditingNewsId(news.id);
    setNewsInput({ title: news.title, content: news.content });
  };

  const cancelEditNews = () => {
    setEditingNewsId(null);
    setNewsInput({ title: '', content: '' });
  };

  // Save phone number from popup
  const savePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      setToast('Please enter a phone number');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setIsSavingPhone(true);
    try {
      const fullPhoneNumber = phoneCountryCode + phoneNumber;
      const response = await fetch('http://localhost:5000/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          number: fullPhoneNumber
        })
      });

      if (!response.ok) throw new Error('Failed to save phone number');

      const updatedUserFromDB = await response.json();
      
      // Get current user from localStorage to ensure we have latest profileUrl
      const savedUser = JSON.parse(localStorage.getItem('cmail_user') || '{}');
      
      // Merge with existing user data - explicitly preserve profileUrl
      const mergedUser = {
        ...savedUser,
        ...updatedUserFromDB,
        profileUrl: savedUser.profileUrl || updatedUserFromDB.profileUrl || ''
      };
      
      localStorage.setItem('cmail_user', JSON.stringify(mergedUser));
      setUser(mergedUser);
      setShowPhonePopup(false);
      setPhoneNumber(''); // Reset only the number part
      setToast('Phone number saved successfully');
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Save phone number error:', error);
      setToast('Failed to save phone number');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSavingPhone(false);
    }
  };

  // Load admin news when folder changes
  useEffect(() => {
    if (user?._id && activeFolder === 'admin-news') {
      fetchNews();
    }
  }, [user, activeFolder, fetchNews]);

  // Fetch all news for all users (global news feed)
  const fetchAllNews = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/news');
      if (response.ok) {
        const data = await response.json();
        setAllNews(data);
      }
    } catch (error) {
      console.error('Fetch all news error:', error);
    }
  }, []);

  // Load global news on mount
  useEffect(() => {
    fetchAllNews();
    // Refresh news every 30 seconds
    const interval = setInterval(fetchAllNews, 30000);
    return () => clearInterval(interval);
  }, [fetchAllNews]);

  const generateApiKey = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/devapi/generate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey);
        setApiKeyVisible(true);
        setApiKeyJustGenerated(true);
        setApiKeyCopied(false);
        // Hide plain text after 60s
        setTimeout(() => { setApiKeyVisible(false); setApiKeyJustGenerated(false); }, 60000);
      }
    } catch (error) {
      console.error('Generate API key error:', error);
      setToast('Failed to generate API key');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const copyApiKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2500);
  };

  const revokeApiKey = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/devapi/revoke-key/${user._id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setApiKey(null);
        setApiKeyVisible(false);
        setApiKeyJustGenerated(false);
        setToast('API key revoked');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Revoke API key error:', error);
    }
  };

  const addRedirectUrl = async () => {
    const val = redirectUrlInput.trim();
    if (!val) return;
    // Basic URL validation + must end with a path segment (contains /)
    if (!val.startsWith('https://') || !val.includes('/', 9)) {
      setToast('URL must start with https:// and include a path (e.g. /callback/abc123)');
      setTimeout(() => setToast(null), 4000);
      return;
    }
    if (redirectUrls.includes(val)) {
      setToast('URL already added');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/devapi/add-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, url: val })
      });
      
      if (response.ok) {
        const data = await response.json();
        setRedirectUrls(data.redirectUrls);
        setRedirectUrlInput('');
        setUrlSaved(true);
        setTimeout(() => setUrlSaved(false), 2000);
      }
    } catch (error) {
      console.error('Add URL error:', error);
    }
  };

  const removeRedirectUrl = async (url) => {
    try {
      const response = await fetch(`http://localhost:5000/api/devapi/remove-url/${user._id}?url=${encodeURIComponent(url)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRedirectUrls(data.redirectUrls);
      }
    } catch (error) {
      console.error('Remove URL error:', error);
    }
  };

  const handleSend = async () => {
    if (!composeTo.trim() || !composeBody.trim() || !recipientSearch) return;

    try {
      const response = await fetch('http://localhost:5000/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user._id,
          recipientId: recipientSearch._id,
          subject: composeSubject || 'No Subject',
          body: composeBody,
          links: composeLinks
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      setIsComposing(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setComposeLinks([]);
      setRecipientSearch(null);
      setRecipientError('');
      
      // Refresh emails after sending
      fetchEmails('sent');
      
      setToast('Message sent');
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Send error:', error);
      setToast('Failed to send message');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const searchRecipient = async (username) => {
    if (!username.trim()) {
      setRecipientSearch(null);
      setRecipientError('');
      return;
    }
    
    setRecipientLoading(true);
    setRecipientError('');
    
    try {
      const response = await fetch(`http://localhost:5000/api/users/lookup/${username}`);
      const data = await response.json();
      
      if (!response.ok) {
        setRecipientSearch(null);
        setRecipientError(data.error || 'User not found');
      } else {
        setRecipientSearch(data);
      }
    } catch {
      setRecipientSearch(null);
      setRecipientError('Failed to search user');
    } finally {
      setRecipientLoading(false);
    }
  };

  const handleRecipientChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9_.-]/g, '');
    setComposeTo(value);
    setRecipientSearch(null);
    setRecipientError('');
    
    // Debounce search
    if (value.length >= 3) {
      clearTimeout(window.recipientSearchTimeout);
      window.recipientSearchTimeout = setTimeout(() => searchRecipient(value), 500);
    }
  };

  const handleTextareaChange = (e) => {
    setComposeBody(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleTextareaClick = (e) => {
    setCursorPosition(e.target.selectionStart);
  };

  const handleTextareaKeyUp = (e) => {
    setCursorPosition(e.target.selectionStart);
  };

  // Reply handlers
  const fetchEmailThread = async (emailId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/emails/thread/${emailId}`);
      if (response.ok) {
        const data = await response.json();
        setEmailThread(data);
        
        // Mark all unread thread emails as read
        data.forEach(threadEmail => {
          if (!threadEmail.read && threadEmail._id !== emailId) {
            markEmailAsRead(threadEmail._id);
          }
        });
      }
    } catch (error) {
      console.error('Fetch thread error:', error);
    }
  };

  // Mark email as read
  const markEmailAsRead = async (emailId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/emails/${emailId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Update local state to mark as read
        setEmails(prev => prev.map(e => 
          e.id === emailId ? { ...e, unread: false } : e
        ));
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !selectedEmail) return;

    try {
      // Determine who to send reply to:
      // If I'm the sender of this email, reply goes to the recipient
      // If I'm the recipient of this email, reply goes to the sender
      const isMeSender = selectedEmail.senderUsername === user.username;
      const recipientId = isMeSender ? selectedEmail.recipientId : selectedEmail.senderId;
      
      console.log('Sending reply:', { 
        senderId: user._id, 
        recipientId, 
        parentEmailId: selectedEmail.id,
        selectedEmailSenderUsername: selectedEmail.senderUsername,
        myUsername: user.username,
        isMeSender
      });
      
      const response = await fetch('http://localhost:5000/api/emails/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user._id,
          recipientId: recipientId,
          parentEmailId: selectedEmail.id,
          subject: selectedEmail.subject,
          body: replyBody,
          links: replyLinks,
          threadId: selectedEmail.threadId || selectedEmail.id
        })
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          // Backend returned HTML (likely server error or not running)
          console.error('Backend returned HTML:', text.substring(0, 200));
          throw new Error('Server error - backend may not be running');
        }
        console.error('Reply failed:', errorData);
        throw new Error(errorData.error || 'Failed to send reply');
      }

      setReplyBody('');
      setReplyLinks([]);
      setIsReplying(false);
      fetchEmailThread(selectedEmail.id);
      fetchEmails(activeFolder);
      setToast('Reply sent');
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Reply error:', error);
      setToast(error.message || 'Failed to send reply');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleStartReply = () => {
    setIsReplying(true);
    fetchEmailThread(selectedEmail.id);
  };

  const handleComposeCancel = () => {
    // If there's content, save as draft
    if (composeTo.trim() || composeBody.trim()) {
      const newDraft = {
        id: Date.now(),
        sender: 'Draft',
        recipient: composeTo ? composeTo + '@c-mail.vercel.app' : '',
        subject: 'Draft',
        preview: composeBody.substring(0, 50) || 'No content',
        body: composeBody,
        time: 'Just now',
        unread: false,
        folder: 'drafts'
      };
      setEmails([newDraft, ...emails]);
      setToast('Saved to drafts');
      setTimeout(() => setToast(null), 3000);
    }
    
    setIsComposing(false);
    setComposeTo('');
    setComposeBody('');
  };

  const filteredEmails = emails.filter(email => {
    // Determine which folder this email belongs to based on dummy rules or explicit state
    let belongsToFolder = false;
    if (activeFolder === 'inbox') {
      belongsToFolder = !email.folder || email.folder === 'inbox';
    } else {
      belongsToFolder = email.folder === activeFolder;
    }

    if (!belongsToFolder) return false;

    const query = searchQuery.toLowerCase();
    if (!query) return true;
    
    return (
      email.subject.toLowerCase().includes(query) ||
      email.sender.toLowerCase().includes(query) ||
      email.preview.toLowerCase().includes(query)
    );
  });

  if (!user) return null;

  return (
    <div className={`cmail-dashboard ${(selectedEmail || isComposing) ? 'show-detail' : ''}`}>
      {/* Phone Number Notification Banner */}
      {!user?.number && (
        <div 
          className="cmail-phone-banner"
          onClick={() => setShowPhonePopup(true)}
        >
          <Phone size={16} />
          <span>Please link your phone number to remove this message</span>
          <button className="cmail-phone-banner-btn">Add Number</button>
        </div>
      )}

      {/* Phone Number Popup Modal */}
      {showPhonePopup && (
        <div className="cmail-phone-popup-overlay" onClick={() => setShowPhonePopup(false)}>
          <div className="cmail-phone-popup" onClick={e => e.stopPropagation()}>
            <div className="cmail-phone-popup-header">
              <Phone size={24} />
              <h3>Link Phone Number</h3>
            </div>
            <p className="cmail-phone-popup-desc">
              Add your phone number to complete your profile and remove this notification.
            </p>
            <div className="cmail-phone-input-wrapper">
              {/* Custom Country Dropdown */}
              <div className="cmail-country-dropdown-container">
                <div 
                  className="cmail-country-dropdown-trigger"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                >
                  <span className="cmail-country-flag">{countryCodes.find(c => c.code === phoneCountryCode)?.flag}</span>
                  <span className="cmail-country-code">{phoneCountryCode}</span>
                  <span className="cmail-dropdown-arrow">▼</span>
                </div>
                
                {showCountryDropdown && (
                  <div className="cmail-country-dropdown-menu">
                    <input
                      type="text"
                      placeholder="Search country..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="cmail-country-search"
                      autoFocus
                    />
                    <div className="cmail-country-list">
                      {countryCodes
                        .filter(c => 
                          c.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
                          c.code.includes(countrySearch)
                        )
                        .map((country) => (
                          <div
                            key={country.code}
                            className={`cmail-country-option ${phoneCountryCode === country.code ? 'selected' : ''}`}
                            onClick={() => {
                              setPhoneCountryCode(country.code);
                              setShowCountryDropdown(false);
                              setCountrySearch('');
                            }}
                          >
                            <span className="cmail-country-option-flag">{country.flag}</span>
                            <span className="cmail-country-option-name">{country.country}</span>
                            <span className="cmail-country-option-code">{country.code}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              
              <input
                type="tel"
                placeholder="799865071"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                className="cmail-phone-popup-input"
              />
            </div>
            <div className="cmail-phone-popup-actions">
              <button 
                className="cmail-phone-popup-cancel"
                onClick={() => setShowPhonePopup(false)}
              >
                Cancel
              </button>
              <button 
                className="cmail-phone-popup-done"
                onClick={savePhoneNumber}
                disabled={isSavingPhone}
              >
                {isSavingPhone ? 'Saving...' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`cmail-sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <aside className={`cmail-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="cmail-sidebar-header">
          <div className="cmail-user-profile">
            <div className="cmail-avatar">
              {user.profileUrl ? (
                <img src={user.profileUrl} alt="Profile" />
              ) : (
                <>{user.firstName[0]}{user.secondName[0]}</>
              )}
            </div>
            <div className="cmail-user-info">
              <span className="cmail-user-name">{user.firstName} {user.secondName}</span>
              <span className="cmail-user-handle">{user.email}</span>
            </div>
          </div>
          <button className="cmail-sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title="Toggle sidebar">
            <Menu size={20} />
          </button>
        </div>

        <nav className="cmail-nav">
          <button 
            className={`cmail-nav-item ${activeFolder === 'inbox' ? 'active' : ''}`}
            onClick={() => { setActiveFolder('inbox'); setSelectedEmail(null); setIsComposing(false); setIsSidebarOpen(false); navigate(`/${username}/inbox`); }}
          >
            <Inbox size={16} />
            <span>Inbox</span>
            {emails.filter(e => e.unread && e.folder === 'inbox').length > 0 && (
              <span className="cmail-badge">
                {emails.filter(e => e.unread && e.folder === 'inbox').length}
              </span>
            )}
          </button>
          <button 
            className={`cmail-nav-item ${activeFolder === 'sent' ? 'active' : ''}`}
            onClick={() => { setActiveFolder('sent'); setSelectedEmail(null); setIsComposing(false); setIsSidebarOpen(false); navigate(`/${username}/sent`); }}
          >
            <Send size={16} />
            <span>Sent</span>
          </button>
          <button 
            className={`cmail-nav-item ${activeFolder === 'drafts' ? 'active' : ''}`}
            onClick={() => { setActiveFolder('drafts'); setSelectedEmail(null); setIsComposing(false); setIsSidebarOpen(false); navigate(`/${username}/drafts`); }}
          >
            <File size={16} />
            <span>Drafts</span>
          </button>

          <div className="cmail-nav-divider" />

          <button 
            className={`cmail-nav-item ${activeFolder === 'devapi' ? 'active' : ''}`}
            onClick={() => { setActiveFolder('devapi'); setSelectedEmail(null); setIsComposing(false); setIsSidebarOpen(false); navigate(`/${username}/devapi`); }}
          >
            <Code2 size={16} />
            <span>Auth API</span>
            <span className="cmail-badge cmail-badge-dev">DEV</span>
          </button>

          <button 
            className={`cmail-nav-item ${activeFolder === 'connected-apps' ? 'active' : ''}`}
            onClick={() => { setActiveFolder('connected-apps'); setSelectedEmail(null); setIsComposing(false); setIsSidebarOpen(false); navigate(`/${username}/connected-apps`); }}
          >
            <Shield size={16} />
            <span>Connected Apps</span>
            {connectedApps.length > 0 && (
              <span className="cmail-badge cmail-badge-count">{connectedApps.length}</span>
            )}
          </button>

          {isAdmin && (
            <button 
              className={`cmail-nav-item ${activeFolder === 'admin-news' ? 'active' : ''}`}
              onClick={() => { setActiveFolder('admin-news'); setSelectedEmail(null); setIsComposing(false); setIsSidebarOpen(false); navigate(`/${username}/admin-news`); }}
            >
              <Megaphone size={16} />
              <span>Admin News</span>
              <span className="cmail-badge cmail-badge-admin">ADMIN</span>
            </button>
          )}
        </nav>

        <div className="cmail-sidebar-footer">
          <button className="cmail-nav-item" onClick={() => { navigate(`/${username}/settings`); setIsSidebarOpen(false); }}>
            <SettingsIcon size={16} />
            <span>Settings</span>
          </button>
          <button className="cmail-nav-item cmail-nav-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="cmail-main-content">

      {/* ========== Developer API Console ========== */}
      {activeFolder === 'devapi' ? (
        <div className="cmail-devapi-pane">
          <div className="cmail-devapi-container">
            {/* Header */}
            <header className="cmail-devapi-header-new">
              <div className="cmail-devapi-header-left">
                <button 
                  className="cmail-menu-btn" 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                  <Menu size={20} />
                </button>
                <div>
                  <div className="cmail-devapi-title-row">
                    <h1>Developer Console</h1>
                    <span className="cmail-devapi-badge">v1.0 Beta</span>
                  </div>
                  <p className="cmail-devapi-subtitle">Manage your C-mail Auth credentials and webhook configurations.</p>
                </div>
              </div>
              <button 
                className="cmail-devapi-btn-outline"
                onClick={() => navigate(`/${username}/api-docs`)}
              >
                View API Docs
              </button>
            </header>

            <div className="cmail-devapi-grid">
              {/* Left Column: Configuration */}
              <div className="cmail-devapi-col-left">
                
                {/* API Credentials Card */}
                <div className="cmail-devapi-card">
                  <div className="cmail-devapi-card-header">
                    <Terminal size={16} className="cmail-devapi-card-icon" />
                    <h2>API Credentials</h2>
                  </div>
                  <p className="cmail-devapi-card-desc">Use this key to authenticate requests from your server.</p>
                  
                  <div className="cmail-devapi-card-body">
                    {apiKeyJustGenerated && (
                      <div className="cmail-devapi-warning-box">
                        <AlertTriangle size={14} />
                        <span><strong>Save your key now.</strong> It will not be shown again after 60 seconds.</span>
                      </div>
                    )}
                    
                    <div className="cmail-devapi-key-section">
                      <label className="cmail-devapi-label">Live API Key</label>
                      <div className="cmail-devapi-key-row">
                        <div className="cmail-devapi-key-input-wrapper">
                          <input
                            type={apiKeyVisible ? "text" : "password"}
                            value={apiKey || ''}
                            readOnly
                            placeholder="No API key generated yet"
                            className={`cmail-devapi-key-input ${!apiKey ? 'placeholder' : ''}`}
                          />
                          {apiKey && (
                            <button 
                              className="cmail-devapi-key-toggle"
                              onClick={() => setApiKeyVisible(!apiKeyVisible)}
                              title={apiKeyVisible ? "Hide key" : "Show key"}
                            >
                              {apiKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}
                        </div>
                        <div className="cmail-devapi-key-actions">
                          {apiKey ? (
                            <>
                              <button 
                                className="cmail-devapi-btn-icon"
                                onClick={copyApiKey}
                                title="Copy API key"
                              >
                                {apiKeyCopied ? <Check size={16} /> : <Copy size={16} />}
                              </button>
                              <button 
                                className="cmail-devapi-btn-danger"
                                onClick={revokeApiKey}
                                title="Revoke key"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <button 
                              className="cmail-devapi-btn-primary"
                              onClick={generateApiKey}
                            >
                              <RotateCcw size={14} />
                              Generate
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="cmail-devapi-key-hint">
                        {apiKey ? 'Keep this key secret. It grants full access to your application\'s auth flow.' : 'Generate an API key to authenticate your requests.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Redirect URLs Card */}
                <div className="cmail-devapi-card">
                  <div className="cmail-devapi-card-header">
                    <Globe size={16} className="cmail-devapi-card-icon" />
                    <h2>Authorized Redirect URIs</h2>
                  </div>
                  <p className="cmail-devapi-card-desc">C-mail will only redirect to these URLs after successful authentication.</p>
                  
                  <div className="cmail-devapi-card-body">
                    <div className="cmail-devapi-urls-list">
                      {redirectUrls.map((url, i) => (
                        <div key={i} className="cmail-devapi-url-verification-card">
                          <div className="cmail-devapi-url-verification-header">
                            <code className="cmail-devapi-url-code">{url}</code>
                            <span className={`cmail-devapi-verification-badge ${verifiedUrls.has(url) ? 'verified' : 'unverified'}`}>
                              {verifiedUrls.has(url) ? 'Verified' : 'Unverified'}
                            </span>
                          </div>
                          
                          {/* Verification Instructions - only show if not verified */}
                          {!verifiedUrls.has(url) && (
                            <div className="cmail-devapi-verification-instructions">
                              <p className="cmail-devapi-verification-text">
                                To verify ownership, create a file at <span className="cmail-devapi-file-path">/.well-known/cmail-challenge.txt</span> containing:
                              </p>
                              <div className="cmail-devapi-verification-row">
                                <code className="cmail-devapi-verification-token">
                                  {verificationToken}
                                </code>
                                <button 
                                  className="cmail-devapi-btn-check"
                                  onClick={() => verifyDomain(url)}
                                >
                                  Check Now
                                </button>
                              </div>
                            </div>
                          )}
                          
                          <button 
                            className="cmail-devapi-url-remove-float"
                            onClick={() => removeRedirectUrl(url)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="cmail-devapi-url-add-row">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={redirectUrlInput}
                        onChange={e => setRedirectUrlInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addRedirectUrl()}
                        className="cmail-devapi-url-input"
                      />
                      <button 
                        className="cmail-devapi-btn-primary"
                        onClick={addRedirectUrl}
                      >
                        <Plus size={14} />
                        {urlSaved ? 'Saved' : 'Add URL'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Quick Integration */}
              <div className="cmail-devapi-col-right">
                <div className="cmail-devapi-card cmail-devapi-card-dashed">
                  <div className="cmail-devapi-card-header-sm">
                    <h2>Quick Integration</h2>
                  </div>
                  
                  <div className="cmail-devapi-card-body">
                    {/* Tabs */}
                    <div className="cmail-devapi-tabs">
                      <button 
                        className={`cmail-devapi-tab ${devApiTab === 'nextjs' ? 'active' : ''}`}
                        onClick={() => setDevApiTab('nextjs')}
                      >
                        Next.js
                      </button>
                      <button 
                        className={`cmail-devapi-tab ${devApiTab === 'curl' ? 'active' : ''}`}
                        onClick={() => setDevApiTab('curl')}
                      >
                        cURL
                      </button>
                      <button 
                        className={`cmail-devapi-tab ${devApiTab === 'email' ? 'active' : ''}`}
                        onClick={() => setDevApiTab('email')}
                      >
                        Sending Email
                      </button>
                    </div>

                    {/* Tab Content */}
                    <div className="cmail-devapi-code-block">
                      {devApiTab === 'nextjs' ? (
                        <pre className="cmail-devapi-code">
                          <code dangerouslySetInnerHTML={{__html: `const loginWithCmail = () => {
  // Redirect to C-mail OAuth
  const params = new URLSearchParams({
    client_id: 'YOUR_API_KEY', // From /devapi
    redirect_uri: 'https://your-app.com/callback',
    response_type: 'code',
    scope: 'profile email'
  });
  
  window.location.href = \`https://c-mail.vercel.app/auth/authorize?\${params}\`;
};`}} />
                        </pre>
                      ) : devApiTab === 'curl' ? (
                        <pre className="cmail-devapi-code">
                          <code dangerouslySetInnerHTML={{__html: `// Exchange code for user data
curl -X POST https://c-mail.vercel.app/api/v1/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "AUTHORIZATION_CODE",
    "clientId": "YOUR_API_KEY"
  }'

// Response: { name, email, picture, username }`}} />
                        </pre>
                      ) : (
                        <pre className="cmail-devapi-code">
                          <code dangerouslySetInnerHTML={{__html: `// Send transactional email via C-mail API
curl -X POST https://c-mail.vercel.app/api/v1/send \\
  -H "Content-Type: application/json" \\
  -d '{
    "apiKey": "YOUR_API_KEY",
    "to": "user@c-mail.vercel.app",
    "subject": "Welcome to Vintag!",
    "body": "<h1>Your verification code: 123456</h1>",
    "appName": "Vintag",
    "category": "verification"
  }'

// Categories: verification, notification, promotion, update
// Rate limit: 50/day (unverified), unlimited (verified domains)`}} />
                        </pre>
                      )}
                    </div>

                    {/* Status Items */}
                    <div className="cmail-devapi-status-list">
                      <div className="cmail-devapi-status-item">
                        <CheckCircle2 size={12} className="cmail-devapi-status-icon" />
                        <span>Rate limit: 10k requests/mo</span>
                      </div>
                      <div className="cmail-devapi-status-item">
                        <CheckCircle2 size={12} className="cmail-devapi-status-icon" />
                        <span>HTTPS Mandatory</span>
                      </div>
                      <div className="cmail-devapi-status-item">
                        <CheckCircle2 size={12} className="cmail-devapi-status-icon" />
                        <span>Email delivery included</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeFolder === 'connected-apps' ? (
        <div className="cmail-devapi-pane">
          <div className="cmail-devapi-container">
            <header className="cmail-devapi-header-new">
              <div className="cmail-devapi-header-left">
                <button 
                  className="cmail-menu-btn" 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h1>Connected Apps</h1>
                  <p className="cmail-devapi-subtitle">Manage apps that have access to your C-mail account.</p>
                </div>
              </div>
            </header>

            <div className="cmail-devapi-grid">
              <div className="cmail-devapi-col-left">
                <div className="cmail-devapi-card">
                  <div className="cmail-devapi-card-header">
                    <Shield size={16} className="cmail-devapi-card-icon" />
                    <h2>Authorized Applications</h2>
                  </div>
                  <p className="cmail-devapi-card-desc">These apps can access your profile information.</p>
                  
                  <div className="cmail-devapi-card-body">
                    {connectedApps.length === 0 ? (
                      <div className="cmail-empty-state" style={{ padding: '40px 0' }}>
                        <Shield size={48} className="cmail-empty-icon" />
                        <h3>No connected apps</h3>
                        <p>Apps you authorize will appear here.</p>
                      </div>
                    ) : (
                      <div className="cmail-devapi-urls-list">
                        {connectedApps.map((app, i) => (
                          <div key={i} className="cmail-devapi-url-verification-card">
                            <div className="cmail-devapi-url-verification-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '8px', 
                                  background: 'linear-gradient(135deg, #6272a4, #7284b6)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '18px',
                                  fontWeight: 600
                                }}>
                                  {app.name?.[0] || 'A'}
                                </div>
                                <div>
                                  <p style={{ margin: 0, fontWeight: 600 }}>{app.name}</p>
                                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Connected {new Date(app.grantedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <span className="cmail-devapi-verification-badge verified">Active</span>
                            </div>
                            
                            <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                Permissions: {app.scope}
                              </p>
                              <button 
                                className="cmail-devapi-btn-danger"
                                onClick={() => revokeAppAccess(app.clientId)}
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                              >
                                Revoke Access
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="cmail-devapi-col-right">
                <div className="cmail-devapi-card cmail-devapi-card-dashed">
                  <div className="cmail-devapi-card-header-sm">
                    <h2>Security Info</h2>
                  </div>
                  <div className="cmail-devapi-card-body">
                    <div className="cmail-devapi-status-list">
                      <div className="cmail-devapi-status-item">
                        <CheckCircle2 size={12} className="cmail-devapi-status-icon" />
                        <span>You control which apps access your data</span>
                      </div>
                      <div className="cmail-devapi-status-item">
                        <CheckCircle2 size={12} className="cmail-devapi-status-icon" />
                        <span>Revoking access stops data sharing immediately</span>
                      </div>
                      <div className="cmail-devapi-status-item">
                        <CheckCircle2 size={12} className="cmail-devapi-status-icon" />
                        <span>Apps only see: name, email, profile picture</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeFolder === 'admin-news' ? (
        <div className="cmail-devapi-pane">
          <div className="cmail-devapi-container">
            <header className="cmail-devapi-header-new">
              <div className="cmail-devapi-header-left">
                <button 
                  className="cmail-menu-btn" 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h1>Admin News</h1>
                  <p className="cmail-devapi-subtitle">
                    {isAdmin ? 'Publish and manage announcements for all C-mail users.' : 'Read announcements from the admin.'}
                  </p>
                </div>
              </div>
            </header>

            <div className="cmail-devapi-grid">
              <div className="cmail-devapi-col-left">
                {/* Create/Edit News Form - Only for Admin */}
                {isAdmin && (
                  <div className="cmail-devapi-card">
                    <div className="cmail-devapi-card-header">
                      <Megaphone size={16} className="cmail-devapi-card-icon" />
                      <h2>{editingNewsId ? 'Edit News' : 'Create News'}</h2>
                    </div>
                    <p className="cmail-devapi-card-desc">
                      {editingNewsId ? 'Update your announcement.' : 'Write a new announcement for all users.'}
                    </p>
                    
                    <div className="cmail-devapi-card-body">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label className="cmail-devapi-label">Title</label>
                          <input
                            type="text"
                            placeholder="Enter news title..."
                            value={newsInput.title}
                            onChange={e => setNewsInput({ ...newsInput, title: e.target.value })}
                            className="cmail-devapi-url-input"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <label className="cmail-devapi-label">Content</label>
                          <textarea
                            placeholder="Enter news content..."
                            value={newsInput.content}
                            onChange={e => setNewsInput({ ...newsInput, content: e.target.value })}
                            className="cmail-compose-textarea"
                            rows={6}
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          {editingNewsId ? (
                            <>
                              <button 
                                className="cmail-devapi-btn-primary"
                                onClick={() => updateNews(editingNewsId)}
                              >
                                <Check size={14} />
                                Update News
                              </button>
                              <button 
                                className="cmail-devapi-btn-outline"
                                onClick={cancelEditNews}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button 
                              className="cmail-devapi-btn-primary"
                              onClick={createNews}
                            >
                              <Plus size={14} />
                              Publish News
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* News List - All Users See This */}
                <div className="cmail-devapi-card">
                  <div className="cmail-devapi-card-header">
                    <File size={16} className="cmail-devapi-card-icon" />
                    <h2>{isAdmin ? 'Published News' : 'Announcements'}</h2>
                  </div>
                  <p className="cmail-devapi-card-desc">
                    {isAdmin ? 'Manage your published announcements.' : 'Latest news from the admin.'}
                  </p>
                  
                  <div className="cmail-devapi-card-body">
                    {(isAdmin ? adminNews : allNews).length === 0 ? (
                      <div className="cmail-empty-state" style={{ padding: '40px 0' }}>
                        <Megaphone size={48} className="cmail-empty-icon" />
                        <h3>{isAdmin ? 'No news published' : 'No announcements yet'}</h3>
                        <p>{isAdmin ? 'Create your first announcement above.' : 'Check back later for updates.'}</p>
                      </div>
                    ) : (
                      <div className="cmail-devapi-urls-list">
                        {(isAdmin ? adminNews : allNews).map((news) => (
                          <div key={news.id} className="cmail-devapi-url-verification-card">
                            <div className="cmail-devapi-url-verification-header">
                              <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{news.title}</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                                  Published {new Date(news.createdAt).toLocaleDateString()}
                                  {news.updatedAt !== news.createdAt && ' (edited)'}
                                </p>
                              </div>
                            </div>
                            
                            <div style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '12px' }}>
                              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                {news.content}
                              </p>
                            </div>
                            
                            {/* Edit/Delete buttons - Only for Admin */}
                            {isAdmin && (
                              <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <button 
                                  className="cmail-devapi-btn-icon"
                                  onClick={() => startEditNews(news)}
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  className="cmail-devapi-btn-danger"
                                  onClick={() => deleteNews(news.id)}
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column - Admin Info */}
              {isAdmin && (
                <div className="cmail-devapi-col-right">
                  <div className="cmail-devapi-card cmail-devapi-card-dashed">
                    <div className="cmail-devapi-card-header-sm">
                      <h2>Admin Info</h2>
                    </div>
                    <div className="cmail-devapi-card-body">
                      <div className="cmail-devapi-status-list">
                        <div className="cmail-devapi-status-item">
                          <CheckCircle2 size={12} className="cmail-devapi-status-icon" />
                          <span>Only you can create, edit, and delete news</span>
                        </div>
                        <div className="cmail-devapi-status-item">
                          <CheckCircle2 size={12} className="cmail-devapi-status-icon" />
                          <span>All users will see your announcements</span>
                        </div>
                        <div className="cmail-devapi-status-item">
                          <CheckCircle2 size={12} className="cmail-devapi-status-icon" />
                          <span>News appears in the global news feed</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
        <div className="cmail-list-pane">
          <div className="cmail-list-header">
            <div className="cmail-list-top-row">
              <button 
                className="cmail-menu-btn" 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                <Menu size={20} />
              </button>
              <h2 className="cmail-folder-title">
                {activeFolder.charAt(0).toUpperCase() + activeFolder.slice(1)}
              </h2>
            </div>
            <div className="cmail-search-bar">
              <Search size={14} className="cmail-search-icon" />
              <input 
                type="text" 
                placeholder="Search" 
                className="cmail-search-input" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* News Feed Banner for All Users - Single Card with +N Badge */}
          {allNews.length > 0 && activeFolder === 'inbox' && (
            <div 
              className="cmail-news-feed-card" 
              onClick={() => {
                // Mark all current news as read when opening
                const allIds = allNews.map(n => n.id);
                const newReadIds = [...new Set([...readNewsIds, ...allIds])];
                setReadNewsIds(newReadIds);
                localStorage.setItem('cmail_read_news', JSON.stringify(newReadIds));
                setShowNewsModal(true);
              }}
              style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid var(--bg-border)',
                background: 'linear-gradient(135deg, rgba(255, 85, 85, 0.15), rgba(255, 85, 85, 0.05))',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 85, 85, 0.25), rgba(255, 85, 85, 0.1))'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 85, 85, 0.15), rgba(255, 85, 85, 0.05))'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Megaphone size={16} style={{ color: '#ff5555' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#ff5555', textTransform: 'uppercase' }}>
                  Admin Announcements
                </span>
                {/* Show +N badge only for unread news */}
                {(() => {
                  const unreadCount = allNews.filter(n => !readNewsIds.includes(n.id)).length;
                  return unreadCount > 0 ? (
                    <span 
                      className="cmail-badge" 
                      style={{ 
                        background: '#ff5555', 
                        color: '#fff',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600
                      }}
                    >
                      +{unreadCount}
                    </span>
                  ) : null;
                })()}
              </div>
              <div style={{ 
                padding: '12px', 
                background: 'var(--bg-surface)', 
                borderRadius: '8px',
                border: '1px solid var(--bg-border)'
              }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>{allNews[0].title}</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {allNews[0].content.substring(0, 80)}{allNews[0].content.length > 80 ? '...' : ''}
                </p>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
                  Posted {new Date(allNews[0].createdAt).toLocaleDateString()}
                </span>
              </div>
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Click to view all {allNews.length} announcements
                </span>
              </div>
            </div>
          )}
          
          <div className="cmail-email-list">
            {isInitialLoad ? (
              // Skeleton loaders for initial 5-second load
              <>
                <div className="cmail-skeleton-item">
                  <div className="cmail-skeleton-avatar"></div>
                  <div className="cmail-skeleton-content">
                    <div className="cmail-skeleton-line cmail-skeleton-line-short"></div>
                    <div className="cmail-skeleton-line"></div>
                    <div className="cmail-skeleton-line cmail-skeleton-line-long"></div>
                  </div>
                </div>
                <div className="cmail-skeleton-item">
                  <div className="cmail-skeleton-avatar"></div>
                  <div className="cmail-skeleton-content">
                    <div className="cmail-skeleton-line cmail-skeleton-line-short"></div>
                    <div className="cmail-skeleton-line"></div>
                    <div className="cmail-skeleton-line cmail-skeleton-line-long"></div>
                  </div>
                </div>
              </>
            ) : filteredEmails.length > 0 ? (
              filteredEmails.map(email => (
                <div 
                  key={email.id} 
                  className={`cmail-email-item ${selectedEmail?.id === email.id ? 'selected' : ''} ${email.unread ? 'unread' : ''}`}
                  onClick={() => { 
                    // Mark as read when clicking an unread email
                    if (email.unread) {
                      markEmailAsRead(email.id);
                    }
                    setSelectedEmail({...email, unread: false}); 
                    setIsSidebarOpen(false); 
                    navigate(`/${username}/${activeFolder}/${email.id}`); 
                    // Load thread if email has replies
                    if (email.replyCount > 0 || email.isReply) {
                      fetchEmailThread(email.id);
                    }
                  }}
                >
                  <div className="cmail-email-item-main">
                    <div className="cmail-email-item-avatar">
                      {email.senderProfileUrl ? (
                        <img src={email.senderProfileUrl} alt={email.sender} />
                      ) : (
                        email.sender?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="cmail-email-item-content">
                      <div className="cmail-email-item-header">
                        <span className="cmail-email-sender">
                          {email.unread && <span className="cmail-unread-dot"></span>}
                          <HighlightText text={email.sender} highlight={searchQuery} />
                          {email.unread && email.replyCount > 0 && selectedEmail?.threadId !== email.threadId && selectedEmail?.id !== email.id && (
                            <span className="cmail-reply-indicator">
                              <CornerDownRight size={10} />
                              {email.replyCount}
                            </span>
                          )}
                        </span>
                        <span className="cmail-email-time">{email.time}</span>
                      </div>
                      <div className="cmail-email-username">{email.senderUsername}@c-mail.vercel.app</div>
                      <div className={`cmail-email-subject ${email.unread ? 'unread' : ''}`}>
                        <HighlightText text={email.subject} highlight={searchQuery} />
                      </div>
                      <div className="cmail-email-preview">
                        <HighlightText text={email.preview} highlight={searchQuery} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="cmail-empty-state" style={{ height: '100%' }}>
                {activeFolder === 'inbox' ? (
                  <>
                    <Mail size={48} className="cmail-empty-icon" style={{ opacity: 0.5 }} />
                    <h3>Welcome to C-mail</h3>
                    <p>Your inbox is empty. Send a message to get started!</p>
                  </>
                ) : activeFolder === 'sent' ? (
                  <>
                    <Send size={48} className="cmail-empty-icon" style={{ opacity: 0.5 }} />
                    <h3>No sent messages</h3>
                    <p>Send your first message.</p>
                    <div className="cmail-empty-arrow">
                      <ArrowRight size={24} />
                    </div>
                  </>
                ) : (
                  <>
                    <Search size={48} className="cmail-empty-icon" />
                    <h3>No results found</h3>
                    <p>Try adjusting your search query.</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Floating Action Button for Compose */}
          {activeFolder === 'sent' && !isComposing && (
            <button 
              className="cmail-fab" 
              onClick={() => setIsComposing(true)}
              aria-label="Compose new email"
            >
              <Edit2 size={24} fill="currentColor" />
            </button>
          )}
        </div>

        <div className="cmail-detail-pane">
          {isComposing ? (
            <div className="cmail-compose-view">
              <div className="cmail-compose-header">
                <h2>New Message</h2>
                <div className="cmail-compose-actions">
                  <button className="cmail-btn-secondary" onClick={handleComposeCancel}>
                    Cancel
                  </button>
                  <button 
                    className="cmail-btn-primary" 
                    onClick={handleSend}
                    disabled={!composeTo.trim() || !composeBody.trim() || !recipientSearch}
                  >
                    <Send size={16} />
                    Send
                  </button>
                </div>
              </div>
              
              <div className="cmail-compose-body">
                <div className="cmail-compose-field">
                  <label>Subject:</label>
                  <div className="cmail-compose-input-wrapper full">
                    <input 
                      type="text" 
                      placeholder="Enter subject..." 
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="cmail-compose-input subject"
                    />
                  </div>
                </div>

                <div className="cmail-compose-field">
                  <label>To:</label>
                  <div className="cmail-compose-input-wrapper">
                    {recipientSearch && (
                      <span className="cmail-compose-to-chip">
                        <span className="cmail-compose-chip-avatar">
                          {recipientSearch.profileUrl ? (
                            <img src={recipientSearch.profileUrl} alt="Profile" />
                          ) : (
                            <span>{recipientSearch.firstName[0]}{recipientSearch.secondName[0]}</span>
                          )}
                        </span>
                        <span className="cmail-compose-chip-name">{recipientSearch.username}</span>
                      </span>
                    )}
                    <input 
                      type="text" 
                      placeholder={recipientSearch ? "" : "username"} 
                      value={composeTo}
                      onChange={handleRecipientChange}
                      className="cmail-compose-input"
                    />
                    <span className="cmail-compose-domain">@c-mail.vercel.app</span>
                  </div>
                </div>

                {recipientLoading && (
                  <div className="cmail-compose-preview searching">
                    <span>Searching...</span>
                  </div>
                )}

                {recipientError && (
                  <div className="cmail-compose-preview error">
                    <span>{recipientError}</span>
                  </div>
                )}

                {recipientSearch && (
                  <div className="cmail-compose-preview found">
                    <div className="cmail-avatar cmail-avatar-small">
                      {recipientSearch.profileUrl ? (
                        <img src={recipientSearch.profileUrl} alt="Profile" />
                      ) : (
                        <>{recipientSearch.firstName[0]}{recipientSearch.secondName[0]}</>
                      )}
                    </div>
                    <div className="cmail-recipient-info">
                      <span className="cmail-recipient-name">{recipientSearch.firstName} {recipientSearch.secondName}</span>
                      <span className="cmail-recipient-email">{recipientSearch.username}@c-mail.vercel.app</span>
                    </div>
                  </div>
                )}

                <div className="cmail-compose-toolbar">
                  <button 
                    className="cmail-toolbar-btn" 
                    onClick={() => setShowLinkModal(true)}
                    title="Add link"
                  >
                    <Link size={16} /> Add Link
                  </button>
                </div>

                <div className="cmail-compose-field cmail-compose-editor">
                  <textarea 
                    ref={textareaRef}
                    placeholder="Write your message..." 
                    value={composeBody}
                    onChange={handleTextareaChange}
                    onClick={handleTextareaClick}
                    onKeyUp={handleTextareaKeyUp}
                    className="cmail-compose-textarea"
                  ></textarea>
                  {composeLinks.length > 0 && (
                    <div className="cmail-compose-links">
                      {composeLinks.map((link, idx) => (
                        <a key={idx} href={link.url} className="cmail-link" target="_blank" rel="noopener noreferrer">
                          {link.text}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : selectedEmail ? (
            <div className="cmail-email-detail">
              <div className="cmail-detail-header">
                <div className="cmail-detail-mobile-actions">
                   <button className="cmail-mobile-back-btn" onClick={() => { setSelectedEmail(null); navigate(`/${username}/${activeFolder}`); }}>
                     <ChevronLeft size={20} />
                     <span>Back</span>
                   </button>
                </div>
                <div className="cmail-detail-header-row">
                  <h1 className="cmail-detail-subject">{selectedEmail.subject}</h1>
                  <button 
                    className="cmail-delete-btn" 
                    onClick={() => { setEmailToDelete(selectedEmail); setShowDeleteConfirm(true); }}
                    title="Delete message"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="cmail-detail-meta">
                  <div className="cmail-detail-sender">
                    <div className="cmail-detail-avatar">
                      {selectedEmail.sender?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="cmail-sender-name">{selectedEmail.sender}</div>
                      <div className="cmail-sender-email">{selectedEmail.senderUsername}@c-mail.vercel.app</div>
                    </div>
                  </div>
                  <div className="cmail-detail-time">{selectedEmail.time}</div>
                </div>
              </div>
              <div className="cmail-detail-body">
                <div style={{ whiteSpace: 'pre-wrap' }}>{selectedEmail.body}</div>
                
                {selectedEmail.links && selectedEmail.links.length > 0 && (
                  <>
                    <br/>
                    <hr style={{ borderColor: 'var(--bg-border)', margin: '20px 0' }}/>
                    <p><strong>Links:</strong></p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedEmail.links.map((link, idx) => (
                        <a key={idx} href={link.url} className="cmail-link" target="_blank" rel="noopener noreferrer">
                          {link.text}
                        </a>
                      ))}
                    </div>
                  </>
                )}

                {/* Thread Display - Linear Style (only for threads with replies) */}
                {emailThread.length > 0 && emailThread.some(e => e.isReply) && (
                  <div className="cmail-thread-container">
                    <div className="cmail-thread-header">
                      <span className="cmail-thread-count"></span>
                      <button 
                        className="cmail-thread-toggle-btn"
                        onClick={() => setFoldedMessages(!foldedMessages)}
                      >
                        {foldedMessages ? 'Show all' : 'Collapse'}
                      </button>
                    </div>
                    
                    <div className="cmail-thread-messages">
                      {(() => {
                        // Logic for the "Fold": show first, last, and optionally middle
                        const total = emailThread.length;
                        const firstMessage = emailThread[0];
                        const lastMessage = emailThread[total - 1];
                        const middleMessages = emailThread.slice(1, -1);
                        
                        // Filter out the currently selected email from thread display
                        // since it's already shown as the main content
                        const isSelectedFirst = firstMessage._id === selectedEmail.id;
                        const isSelectedLast = lastMessage._id === selectedEmail.id;
                        const filteredMiddle = middleMessages.filter(m => m._id !== selectedEmail.id);
                        
                        return (
                          <>
                            {/* First message - shown if not the selected one */}
                            {!isSelectedFirst && (
                              <div className={`cmail-thread-message ${firstMessage._id === selectedEmail.id ? 'current' : ''}`}>
                                <div className="cmail-thread-avatar">
                                  {firstMessage.sender?.profileUrl ? (
                                    <img src={firstMessage.sender.profileUrl} alt={firstMessage.senderName} />
                                  ) : (
                                    firstMessage.senderName?.[0] || '?'
                                  )}
                                </div>
                                <div className="cmail-thread-content">
                                  <div className="cmail-thread-meta">
                                    <span className="cmail-thread-author">{firstMessage.senderName}</span>
                                    <span className="cmail-thread-time">
                                      {new Date(firstMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="cmail-thread-body">{firstMessage.body}</div>
                                </div>
                              </div>
                            )}
                            
                            {/* Fold indicator for middle messages */}
                            {filteredMiddle.length > 0 && foldedMessages && (
                              <button 
                                className="cmail-thread-fold"
                                onClick={() => setFoldedMessages(false)}
                              >
                                <span className="cmail-fold-line"></span>
                                <span className="cmail-fold-text">{filteredMiddle.length} older messages</span>
                                <span className="cmail-fold-line"></span>
                              </button>
                            )}
                            
                            {/* Middle messages - shown when unfolded */}
                            {!foldedMessages && filteredMiddle.map((msg, idx) => (
                              <div key={idx} className={`cmail-thread-message ${msg._id === selectedEmail.id ? 'current' : ''}`}>
                                <div className="cmail-thread-avatar">
                                  {msg.sender?.profileUrl ? (
                                    <img src={msg.sender.profileUrl} alt={msg.senderName} />
                                  ) : (
                                    msg.senderName?.[0] || '?'
                                  )}
                                </div>
                                <div className="cmail-thread-content">
                                  <div className="cmail-thread-meta">
                                    <span className="cmail-thread-author">{msg.senderName}</span>
                                    <span className="cmail-thread-time">
                                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="cmail-thread-body">{msg.body}</div>
                                </div>
                              </div>
                            ))}
                            
                            {/* Last message - shown if not the selected one and different from first */}
                            {total > 1 && !isSelectedLast && lastMessage._id !== firstMessage._id && (
                              <div className={`cmail-thread-message ${lastMessage._id === selectedEmail.id ? 'current' : ''}`}>
                                <div className="cmail-thread-avatar">
                                  {lastMessage.sender?.profileUrl ? (
                                    <img src={lastMessage.sender.profileUrl} alt={lastMessage.senderName} />
                                  ) : (
                                    lastMessage.senderName?.[0] || '?'
                                  )}
                                </div>
                                <div className="cmail-thread-content">
                                  <div className="cmail-thread-meta">
                                    <span className="cmail-thread-author">{lastMessage.senderName}</span>
                                    <span className="cmail-thread-time">
                                      {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="cmail-thread-body">{lastMessage.body}</div>
                                </div>
                              </div>
                            )}
                            {/* Reply Composer - Below thread as separate section */}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Reply Section - Below the thread */}
                {selectedEmail && (
                  <div className="cmail-reply-section">
                    {isReplying ? (
                      <div className="cmail-reply-composer-box">
                        <div className="cmail-reply-composer-header">
                          <CornerDownRight size={16} />
                          <span>Reply to {selectedEmail.senderUsername === user.username ? selectedEmail.recipient : selectedEmail.sender}</span>
                        </div>
                        <textarea
                          placeholder="Write your reply..."
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          className="cmail-reply-textarea-box"
                          rows={4}
                          autoFocus
                        />
                        <div className="cmail-reply-actions-box">
                          <button 
                            className="cmail-btn-secondary"
                            onClick={() => { setIsReplying(false); setReplyBody(''); }}
                          >
                            Cancel
                          </button>
                          <button 
                            className="cmail-btn-primary"
                            onClick={handleReply}
                            disabled={!replyBody.trim()}
                          >
                            <Send size={16} />
                            Send Reply
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="cmail-reply-btn-box"
                        onClick={handleStartReply}
                      >
                        <CornerDownRight size={16} />
                        Reply to this message
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="cmail-empty-state">
              <Mail size={48} className="cmail-empty-icon" />
              <h3>No message selected</h3>
                <p>Select a message from the list to read it.</p>
            </div>
          )}
        </div>
        </>
      )}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="cmail-toast">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="cmail-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="cmail-modal" onClick={e => e.stopPropagation()}>
            <div className="cmail-modal-icon">
              <AlertTriangle size={32} />
            </div>
            <h2>Delete Message?</h2>
            <p>This message will be deleted forever and cannot be recovered.</p>
            <div className="cmail-modal-actions">
              <button 
                className="cmail-modal-btn cancel" 
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="cmail-modal-btn confirm" 
                onClick={async () => {
                  if (emailToDelete) {
                    try {
                      // Delete from database
                      const response = await fetch(`http://localhost:5000/api/emails/${emailToDelete.id}`, {
                        method: 'DELETE'
                      });
                      
                      if (response.ok) {
                        // Remove from UI
                        setEmails(emails.filter(e => e.id !== emailToDelete.id));
                        setSelectedEmail(null);
                        navigate(`/${username}/${activeFolder}`);
                        setToast('Message deleted forever');
                      } else {
                        setToast('Failed to delete message');
                      }
                    } catch (error) {
                      console.error('Delete error:', error);
                      setToast('Failed to delete message');
                    }
                    setTimeout(() => setToast(null), 3000);
                  }
                  setShowDeleteConfirm(false);
                }}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* News Modal - View All Announcements */}
      {showNewsModal && (
        <div className="cmail-modal-overlay" onClick={() => setShowNewsModal(false)}>
          <div 
            className="cmail-modal" 
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Megaphone size={24} style={{ color: '#ff5555' }} />
              <h2 style={{ margin: 0 }}>Admin Announcements</h2>
              <span 
                className="cmail-badge" 
                style={{ 
                  background: '#ff5555', 
                  color: '#fff',
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontWeight: 600
                }}
              >
                {allNews.length}
              </span>
            </div>
            
            <div style={{ 
              maxHeight: '60vh', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              paddingRight: '8px'
            }}>
              {allNews.map((news, index) => (
                <div 
                  key={news.id} 
                  style={{ 
                    padding: '16px', 
                    background: 'var(--bg-surface)', 
                    borderRadius: '12px',
                    border: '1px solid var(--bg-border)',
                    borderLeft: '4px solid #ff5555'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 600,
                        color: '#ff5555',
                        background: 'rgba(255, 85, 85, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      #{index + 1}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(news.createdAt).toLocaleDateString()} at {new Date(news.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>{news.title}</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {news.content}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="cmail-modal-actions" style={{ marginTop: '20px' }}>
              <button 
                className="cmail-modal-btn confirm" 
                onClick={() => setShowNewsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="cmail-modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="cmail-modal" onClick={e => e.stopPropagation()}>
            <h2>Add Link</h2>
            <div className="cmail-modal-body">
              <div className="cmail-link-field">
                <label>Link Text:</label>
                <input 
                  type="text" 
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Text to display"
                  className="cmail-modal-input"
                />
              </div>
              <div className="cmail-link-field">
                <label>URL:</label>
                <input 
                  type="url" 
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="cmail-modal-input"
                />
              </div>
            </div>
            <div className="cmail-modal-actions">
              <button 
                className="cmail-modal-btn cancel" 
                onClick={() => setShowLinkModal(false)}
              >
                Cancel
              </button>
              <button 
                className="cmail-modal-btn confirm green" 
                onClick={() => {
                  if (!linkText.trim() || !linkUrl.trim()) {
                    setToast('Please fill in both link text and URL');
                    setTimeout(() => setToast(null), 3000);
                    return;
                  }
                  const before = composeBody.substring(0, cursorPosition);
                  const after = composeBody.substring(cursorPosition);
                  const newBody = before + linkText + after;
                  setComposeLinks([...composeLinks, { text: linkText, url: linkUrl }]);
                  setComposeBody(newBody);
                  setLinkText('');
                  setLinkUrl('');
                  setShowLinkModal(false);
                  setToast('Link added');
                  setTimeout(() => setToast(null), 3000);
                }}
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
