import { useEffect, useMemo, useRef, useState } from 'react';
import MoveAdmin from './MoveAdmin.jsx';

const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

const NAV = [
  ['dashboard', '⌂', 'Overview'],
  ['users', '👥', 'People'],
  ['products', '🧶', 'Crochet Hub'],
  ['categories', '▦', 'Crochet Categories'],
  ['subcategories', '◇', 'Collections & Styles'],
  ['variants', '◈', 'Variants & Stock'],
  ['orders', '🧾', 'Orders'],
  ['logistics', '🚚', 'Logistics'],
  ['inventory', '📦', 'Inventory'],
  ['payments', '💳', 'Payments'],
  ['hpay', '₹', 'HPay Control'],
  ['locations', '📍', 'Delivery & Locations'],
  ['coupons', '🎟️', 'Offers & Promotions'],
  ['works', '🛠️', 'Works'],
  ['move', '🚕', 'Move'],
  ['vendors', '🤝', 'Vendors'],
  ['learnEarn', '🎓', 'Learn & Earn'],
  ['notifications', '🔔', 'Communication'],
  ['moderation', '🛡️', 'Community & Safety'],
  ['settings', '⚙️', 'Platform Settings'],
  ['future', '✦', 'Future Ecosystem'],
];

const FUTURE_LAB = [
  { icon: '🌍', title: 'Countries & Regions', text: 'Prepare multi-country operating scopes, currencies and regional controls.', status: 'Reserved' },
  { icon: '🏢', title: 'Branches & Franchise', text: 'Future branch, store and franchise management without rebuilding the catalogue.', status: 'Reserved' },
  { icon: '🎧', title: 'Support / OMS', text: 'Restricted customer support workspace with role-based visibility and audit trails.', status: 'Planned' },
  { icon: '🤝', title: 'Vendor Network', text: 'Vendor onboarding, catalogue ownership, inventory and payout controls.', status: 'Later phase' },
  { icon: '👷', title: 'Worker Operations', text: 'Workforce, tasks, fulfilment and delivery operations.', status: 'Later phase' },
  { icon: '🧶', title: 'Seasonal & Occasion', text: 'Festival, season, wedding, school and local occasion merchandising.', status: 'Foundation' },
  { icon: '🧩', title: 'Collections & Programs', text: 'Admin-created collections and reusable business programs.', status: 'Foundation' },
  { icon: '💡', title: 'Ideas & Opportunities', text: 'A safe place for future business ideas, partnerships and opportunities.', status: 'Reserved' },
];

function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem('howdiAdminToken') || '');
  const [learnCourses,setLearnCourses]=useState([]);
  const [learnCourseStudio,setLearnCourseStudio]=useState(null);
  const [learnCourseBusy,setLearnCourseBusy]=useState(false);
  const [teacherFoundation,setTeacherFoundation]=useState({teachers:[],summary:{}});
  const [teacherFoundationBusy,setTeacherFoundationBusy]=useState(false);
  const [teacherFoundationFilter,setTeacherFoundationFilter]=useState('ALL');
  const [teacherFoundationSearch,setTeacherFoundationSearch]=useState('');

  const [learnCourseForm,setLearnCourseForm]=useState({
    title:'',tagline:'Feel like Grandma is teaching you.',description:'',category:'Crochet',
    level:'BEGINNER',language:'English',duration_minutes:'',teaching_style:'GRANDMA_GUIDED',
    outcomes:'',materials:'',
    purchase_mode:'FREE',price:'0',sale_price:'',currency:'INR',access_days:'',
    refund_policy_text:'',live_class_included:false
  });
  const [learnModuleForm,setLearnModuleForm]=useState({title:'',description:''});
  const [learnLessonForm,setLearnLessonForm]=useState({
    module_id:'',title:'',lesson_type:'VIDEO',content_url:'',content_text:'',
    duration_minutes:'',grandma_tip:'',practice_task:'',is_preview:false
  });
  const [learnProjectForm,setLearnProjectForm]=useState({
    title:'',description:'',submission_instructions:'',evaluation_criteria:'',minimum_score:'60'
  });
  const [learnCommercialForm,setLearnCommercialForm]=useState({
    purchase_mode:'FREE',price:'0',sale_price:'',currency:'INR',access_days:'',
    refund_policy_text:'',live_class_included:false
  });
  const [learnCommercialBusy,setLearnCommercialBusy]=useState(false);
  const [learnStudioTab,setLearnStudioTab]=useState("overview");
  const [learnCommerce,setLearnCommerce]=useState({summary:{},purchases:[]});
  const [learnCommerceBusy,setLearnCommerceBusy]=useState(false);
  const [learnCommerceFilter,setLearnCommerceFilter]=useState("ALL");
  const [learnCommerceSearch,setLearnCommerceSearch]=useState("");
  const [selectedLearnPurchase,setSelectedLearnPurchase]=useState(null);
  const [learnAiReview,setLearnAiReview]=useState({summary:{total:0,in_review:0,approved:0,changes_required:0,rejected:0,drafts:0,ai_assisted:0},assets:[],policy:{}});
  const [learnAiReviewBusy,setLearnAiReviewBusy]=useState(false);
  const [learnAiReviewFilter,setLearnAiReviewFilter]=useState("IN_REVIEW");
  const [learnAiReviewSearch,setLearnAiReviewSearch]=useState("");
  const [selectedLearnAiAsset,setSelectedLearnAiAsset]=useState(null);
  const [learnAiAssetDetail,setLearnAiAssetDetail]=useState(null);
  const [learnAiDecision,setLearnAiDecision]=useState("APPROVED");
  const [learnAiFeedback,setLearnAiFeedback]=useState("");
  const [learnAiBridgeCourse,setLearnAiBridgeCourse]=useState(null);
  const [learnAiBridgeForm,setLearnAiBridgeForm]=useState({module_id:"",title:"",lesson_type:"TEXT",duration_minutes:""});
  const [learnAiBridgeBusy,setLearnAiBridgeBusy]=useState(false);
  const [learnOpportunityControl,setLearnOpportunityControl]=useState({summary:{},opportunities:[]});
  const [learnOpportunityBusy,setLearnOpportunityBusy]=useState(false);
  const [learnOpportunityFilter,setLearnOpportunityFilter]=useState("ALL");
  const [learnOpportunitySelected,setLearnOpportunitySelected]=useState(null);
  const [learnOpportunityInterests,setLearnOpportunityInterests]=useState([]);
  const [learnAccessControl,setLearnAccessControl]=useState({plans:[],subscriptions:[]});
  const [learnAccessBusy,setLearnAccessBusy]=useState(false);
  const [learnAccessSelectedPlan,setLearnAccessSelectedPlan]=useState(null);
  const [learnAccessCourseIds,setLearnAccessCourseIds]=useState([]);
  const [learnAccessForm,setLearnAccessForm]=useState({name:"",description:"",price:"0",currency:"INR",billing_cycle:"MONTHLY",access_days:"",sort_order:"0",benefits:""});
  const [learnAccessActivation,setLearnAccessActivation]=useState({source:"ADMIN_GRANT",payment_reference:""});
  const [learnMarketIntel,setLearnMarketIntel]=useState({summary:{},skill_signals:[],opportunity_interest_signals:[],course_signals:[]});
  const [learnMarketBusy,setLearnMarketBusy]=useState(false);
  const [learnOpportunityPipeline,setLearnOpportunityPipeline]=useState({summary:{},pipeline:[]});
  const [learnOpportunityPipelineBusy,setLearnOpportunityPipelineBusy]=useState(false);
  const [learnOpportunityPipelineFilter,setLearnOpportunityPipelineFilter]=useState("ACTIVE");
  const [learnOpportunityPipelineSelected,setLearnOpportunityPipelineSelected]=useState(null);
  const [learnOpportunityPipelineForm,setLearnOpportunityPipelineForm]=useState({status:"",stage_note:"",next_action:"",next_action_at:"",outcome_type:"",outcome_note:""});
  const [learnPartnerControl,setLearnPartnerControl]=useState({partners:[],programs:[],members:[]});
  const [learnPartnerBusy,setLearnPartnerBusy]=useState(false);
  const [learnPartnerForm,setLearnPartnerForm]=useState({name:"",partner_type:"SHG",description:"",contact_name:"",contact_email:"",contact_phone:"",city:"",state:"",country:"India"});
  const [learnPartnerProgramForm,setLearnPartnerProgramForm]=useState({partner_id:"",title:"",description:"",program_type:"SKILL_COHORT",target_group:"",seats:"",starts_at:"",ends_at:"",visibility:"PRIVATE",course_ids:[],opportunity_ids:[]});
  const [learnAiVisionControl,setLearnAiVisionControl]=useState({summary:{},reviews:[],provider:{}});
  const [learnAiVisionBusy,setLearnAiVisionBusy]=useState(false);
  const [learnHpayEconomy,setLearnHpayEconomy]=useState({learner_rewards:{totals:{},rules:[],courses:[],participants:[]},teacher_summary:{},teachers:[]});
  const [learnHpayBusy,setLearnHpayBusy]=useState(false);
  const [learnHpayRule,setLearnHpayRule]=useState({course_id:"",reward_amount:"",reward_status:"DISABLED",effective_from:"",effective_until:"",admin_note:""});
  const [learnAccessHealth,setLearnAccessHealth]=useState({summary:{},mismatches:[]});
  const [learnAccessHealthBusy,setLearnAccessHealthBusy]=useState(false);
  const [learnAccessReconcileResult,setLearnAccessReconcileResult]=useState(null);
  const [learnAdminSecurity,setLearnAdminSecurity]=useState({current_session:null,active_sessions:[],recent_audit:[],policy:{}});
  const [learnAdminSecurityBusy,setLearnAdminSecurityBusy]=useState(false);
  const [teacherDeliveryControl,setTeacherDeliveryControl]=useState({summary:{},direct:[],groups:[],recent:[]});
  const [teacherDeliveryBusy,setTeacherDeliveryBusy]=useState(false);
  const [teacherDeliverySelected,setTeacherDeliverySelected]=useState(null);
  const [teacherDeliveryForm,setTeacherDeliveryForm]=useState({decision:"VALIDATED",amount:"",reason:""});
  const [teacherSettlementControl,setTeacherSettlementControl]=useState({summary:{},ready:[],blocked:[],settlements:[]});
  const [teacherSettlementBusy,setTeacherSettlementBusy]=useState(false);
  const [teacherSettlementNote,setTeacherSettlementNote]=useState("");
  const [teacherPayoutControl,setTeacherPayoutControl]=useState({summary:{},eligible_settlements:[],batches:[]});
  const [teacherPayoutBusy,setTeacherPayoutBusy]=useState(false);
  const [teacherPayoutSelected,setTeacherPayoutSelected]=useState([]);
  const [teacherPayoutNote,setTeacherPayoutNote]=useState("");
  const [teacherPayoutReference,setTeacherPayoutReference]=useState("");
  const [teacherPayoutRecon,setTeacherPayoutRecon]=useState({latest:null,issues:[],history:[]});
  const [teacherPayoutReconBusy,setTeacherPayoutReconBusy]=useState(false);
  const [teacherStatements,setTeacherStatements]=useState({summary:{},teachers:[]});
  const [teacherStatementsBusy,setTeacherStatementsBusy]=useState(false);
  const [teacherStatementMonth,setTeacherStatementMonth]=useState(new Date().toISOString().slice(0,7));
  const [teacherStatementCases,setTeacherStatementCases]=useState({summary:{},cases:[]});
  const [teacherStatementCaseBusy,setTeacherStatementCaseBusy]=useState(false);
  const [teacherCaseTriageDraft,setTeacherCaseTriageDraft]=useState({id:null,assigned_to:'',priority:'NORMAL',due_at:''});
  const [teacherCaseAnalytics,setTeacherCaseAnalytics]=useState({summary:{},aging:{},owner_load:[],priority:[],trend:[]});
  const [teacherCaseAnalyticsBusy,setTeacherCaseAnalyticsBusy]=useState(false);
  const [teacherCaseConversation,setTeacherCaseConversation]=useState({case_id:null,messages:[]});
  const [teacherCaseReply,setTeacherCaseReply]=useState("");
  const [teacherCaseReplyInternal,setTeacherCaseReplyInternal]=useState(false);
  const [teacherCaseConversationBusy,setTeacherCaseConversationBusy]=useState(false);
  const [v1933Templates,setV1933Templates]=useState([]);
  const [v1933Quality,setV1933Quality]=useState({quality:{},taxonomy:[]});
  const [v1933Taxonomy,setV1933Taxonomy]=useState({id:null,category:'GENERAL',root_cause:'',impact_level:'NORMAL',tags:''});
  const [v1937Evidence,setV1937Evidence]=useState({case_id:null,items:[]});
  const [v1937EvidenceForm,setV1937EvidenceForm]=useState({title:'',reference_code:'',reference_url:'',note:''});
  const [v1937Closure,setV1937Closure]=useState(null);
  const [v1937Duplicates,setV1937Duplicates]=useState([]);
  const [v1941Followups,setV1941Followups]=useState({case_id:null,items:[]});
  const [v1941FollowupForm,setV1941FollowupForm]=useState({due_at:'',note:''});
  const [v1941Impact,setV1941Impact]=useState(null);
  const [v1945FollowupQueue,setV1945FollowupQueue]=useState({summary:{},followups:[]});
  const [v1945ReopenRequests,setV1945ReopenRequests]=useState([]);
  const [v1945Watchers,setV1945Watchers]=useState({case_id:null,items:[]});
  const [v1945WatcherForm,setV1945WatcherForm]=useState({watcher_reference:'',watcher_role:''});
  const [v1945Approval,setV1945Approval]=useState(null);
  const [v1949Risk,setV1949Risk]=useState({summary:{},cases:[]});
  const [v1949Knowledge,setV1949Knowledge]=useState([]);
  const [v1949KnowledgeForm,setV1949KnowledgeForm]=useState({title:'',category:'GENERAL',root_cause:'',resolution_pattern:''});
  const [v1949Handoff,setV1949Handoff]=useState({case_id:null,to_owner:'',reason:'',history:[]});
  const [v1953Recommendations,setV1953Recommendations]=useState({case_id:null,items:[]});
  const [v1953Acceptance,setV1953Acceptance]=useState({summary:{},categories:[]});
  const [v1957Effectiveness,setV1957Effectiveness]=useState({summary:{},cases:[]});
  const [v1957Blockers,setV1957Blockers]=useState({case_id:null,items:[]});
  const [v1957BlockerForm,setV1957BlockerForm]=useState({blocker_type:'DEPENDENCY',title:'',owner_reference:'',due_at:''});
  const [v1961RootCause,setV1961RootCause]=useState({summary:{},roots:[]});
  const [v1961Capa,setV1961Capa]=useState({summary:{},actions:[]});
  const [v1961Recurrence,setV1961Recurrence]=useState({summary:{},recurrence:[]});
  const [v1961CapaForm,setV1961CapaForm]=useState({root_cause_code:'',title:'',action_text:'',owner_reference:'',due_at:''});
  const [v1965Alerts,setV1965Alerts]=useState([]);
  const [v1965Playbooks,setV1965Playbooks]=useState([]);
  const [v1965PlaybookForm,setV1965PlaybookForm]=useState({root_cause_code:'',title:'',prevention_steps:'',verification_steps:''});
  const [v1975Effectiveness,setV1975Effectiveness]=useState({summary:{},rows:[]});
  const [v1975RepeatCases,setV1975RepeatCases]=useState([]);
  const [v1975Experience,setV1975Experience]=useState({summary:{},cases:[]});
  const [v1975Weekly,setV1975Weekly]=useState({summary:{}});
  const [v1975Command,setV1975Command]=useState({summary:{}});
  const [v1975Health,setV1975Health]=useState(null);
  const [v1975Readiness,setV1975Readiness]=useState(null);
  const [v1985Gaps,setV1985Gaps]=useState([]);
  const [v1985Blockers,setV1985Blockers]=useState([]);
  const [v1985Trust,setV1985Trust]=useState({summary:{},teachers:[]});
  const [v1985Integrity,setV1985Integrity]=useState({});
  const [v1985LearnerIntegrity,setV1985LearnerIntegrity]=useState([]);
  const [v1985Scorecard,setV1985Scorecard]=useState({});
  const [v1985Gate,setV1985Gate]=useState(null);
  const [v1995History,setV1995History]=useState([]);
  const [v1995DualQueue,setV1995DualQueue]=useState([]);
  const [v1995Trends,setV1995Trends]=useState([]);
  const [v1995Heatmap,setV1995Heatmap]=useState([]);
  const [v1995Recap,setV1995Recap]=useState(null);
  const [v1995Freeze,setV1995Freeze]=useState(null);
  const [v2005Freezes,setV2005Freezes]=useState([]);
  const [v2005Packs,setV2005Packs]=useState([]);
  const [v2005OpenItems,setV2005OpenItems]=useState([]);
  const [v2005Matrix,setV2005Matrix]=useState({gaps:[],blockers:[]});
  const [v2005Scorecard,setV2005Scorecard]=useState({});
  const [v2005Integrity,setV2005Integrity]=useState([]);
  const [v2005Capabilities,setV2005Capabilities]=useState([]);
  const [v2005Qa,setV2005Qa]=useState([]);
  const [v2005Readiness,setV2005Readiness]=useState(null);
  const [v2005Seal,setV2005Seal]=useState(null);
  const [v2006Comp,setV2006Comp]=useState([]);
  const [learnAdminView,setLearnAdminView]=useState('overview');
  const [v2010Teachers,setV2010Teachers]=useState([]);
  const [v2010CompForm,setV2010CompForm]=useState({teacher_profile_id:'',model:'HOURLY',hourly_rate:'',session_rate:'',course_amount:'',learner_rate:'',fixed_amount:'',course_id:'',batch_id:'',effective_from:'',effective_to:'',terms_note:''});
  const [v2010CompBusy,setV2010CompBusy]=useState(false);
  const [v2017CompCalculations,setV2017CompCalculations]=useState([]);
  const [v2017CalcBusy,setV2017CalcBusy]=useState(false);
  const [v2017CalcForm,setV2017CalcForm]=useState({agreement_id:'',delivery_type:'DIRECT',delivery_reference:'',validated_minutes:'',validated_sessions:'',eligible_learners:'',course_completion_percent:''});
















  const [teacherDisputeAdjustments,setTeacherDisputeAdjustments]=useState({summary:{},closed_periods:[],cases:[]});
  const [teacherDisputeAdjustmentBusy,setTeacherDisputeAdjustmentBusy]=useState(false);
  const [teacherDisputeAdjustmentDraft,setTeacherDisputeAdjustmentDraft]=useState({case_id:null,original_close_id:'',adjustment_type:'CORRECTION',amount:'',reason:''});
  const [learnOpportunityForm,setLearnOpportunityForm]=useState({
    title:"",organization_name:"HOWDI Opportunity Partner",opportunity_type:"PROJECT",description:"",
    location_mode:"FLEXIBLE",location_label:"",required_skill_terms:"",required_course_id:"",
    min_verified_evidence:"0",min_verified_projects:"0",min_readiness:"0",slots:"",
    compensation_note:"",application_note:"",closes_at:""
  });
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminVariants') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [variantSearch, setVariantSearch] = useState('');
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantForm, setVariantForm] = useState({ productId:'', color:'', size:'', sku:'', regularPrice:'', offerPrice:'', discountPercent:'', stock:'', lowStockThreshold:'5', active:true });
  const [locations, setLocations] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminLocations') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [locationSearch, setLocationSearch] = useState('');
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({ pincode:'', city:'', state:'', country:'India', serviceable:true, active:true, standardCharge:'49', expressAvailable:false, expressCharge:'99', freeDeliveryAbove:'999', estimatedDaysMin:'3', estimatedDaysMax:'5' });
  const [inventoryMoves, setInventoryMoves] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminInventoryMoves') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryForm, setInventoryForm] = useState({ variantId:'', mode:'in', quantity:'', reason:'', reference:'' });
  // ORDER CONTROL TOWER — admin workflow state. Phase A persists locally until checkout APIs are connected.
  const [orders, setOrders] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminOrders') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [ordersLoading,setOrdersLoading]=useState(false);
  const [shipments,setShipments]=useState([]);
  const [deliveryRates,setDeliveryRates]=useState([]);
  const [newDeliveryRate,setNewDeliveryRate]=useState({name:"Standard up to 1 kg",serviceType:"standard",minWeightKg:0,maxWeightKg:1,maxDistanceKm:"",baseCharge:250,additionalWeightStepKg:1,additionalWeightCharge:0,codCharge:0,rtoCharge:0,remoteAreaCharge:0,chargePayer:"customer",isActive:true,sortOrder:10});
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  // PAYMENTS CONTROL — admin transaction monitoring, linked to order records where available.
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentHpayTrace,setPaymentHpayTrace]=useState(null);
  const [paymentHpayBusy,setPaymentHpayBusy]=useState(false);
  const [paymentTransactions,setPaymentTransactions]=useState([]);
  const [paymentLedgerSummary,setPaymentLedgerSummary]=useState(null);
  const [paymentLedgerLoading,setPaymentLedgerLoading]=useState(false);
  const [paymentRefundControl,setPaymentRefundControl]=useState(null);
  const [paymentRefundAmount,setPaymentRefundAmount]=useState('');
  const [paymentRefundReason,setPaymentRefundReason]=useState('');
  const [paymentRefundBusy,setPaymentRefundBusy]=useState(false);
  const [paymentIntegrity,setPaymentIntegrity]=useState(null);
  const [paymentIntegrityBusy,setPaymentIntegrityBusy]=useState(false);
  // HPAY CONTROL — frontend operations foundation. Real payment APIs are connected later.
  const [hpaySearch, setHpaySearch] = useState('');
  const [hpayStatusFilter, setHpayStatusFilter] = useState('all');
  const [hpaySection, setHpaySection] = useState('overview');
  const [hpayMoreOpen,setHpayMoreOpen]=useState(false);
  const [selectedHpay, setSelectedHpay] = useState(null);
  const [hpayRiskMode, setHpayRiskMode] = useState('balanced');
  const [hpaySettings, setHpaySettings] = useState({ enabled:true, qr:true, upi:true, bank:true, requests:true, chatPay:true, dailyLimit:'100000', singleLimit:'25000', autoRefund:false });
  const [hpayTransactions, setHpayTransactions] = useState([]);
  const [hpayUsers, setHpayUsers] = useState([]);
  const [hpayRequests, setHpayRequests] = useState([]);
  const [hpayRiskEvents, setHpayRiskEvents] = useState([]);
  const [hpayOverview, setHpayOverview] = useState(null);
  const [hpayLoading, setHpayLoading] = useState(false);
  const [hpayError, setHpayError] = useState('');
  const [notifications, setNotifications] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminNotifications') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [notificationSearch, setNotificationSearch] = useState('');
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [notificationForm, setNotificationForm] = useState({ title:'', message:'', audience:'all_customers', channel:'in_app', type:'system', schedule:'now' });
  const [reports, setReports] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminReports') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [reportSearch, setReportSearch] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportForm, setReportForm] = useState({ reporter:'', target:'', targetType:'user', reason:'', details:'' });
  const [platformSettings, setPlatformSettings] = useState(() => { try { return JSON.parse(localStorage.getItem('howdiPlatformSettings') || '{"maintenance":false,"wallet":true,"connect":true,"vibe":false,"withdrawals":false,"audit":true}'); } catch { return { maintenance:false,wallet:true,connect:true,vibe:false,withdrawals:false,audit:true }; } });
  const [works, setWorks] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminWorks') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [workSearch, setWorkSearch] = useState('');
  const [workStatusFilter, setWorkStatusFilter] = useState('all');
  const [selectedWork, setSelectedWork] = useState(null);
  const [editingWork, setEditingWork] = useState(null);
  const [workForm, setWorkForm] = useState({ title:'', category:'Home & Local Services', workType:'one_time', city:'', pincode:'', budget:'', scheduleDate:'', description:'', skills:'', status:'open', priority:'normal', active:true });
  const [worksSection, setWorksSection] = useState('overview');
  const [worksBookings,setWorksBookings]=useState([]);
  const [worksBookingSearch,setWorksBookingSearch]=useState('');
  const [worksBookingFilter,setWorksBookingFilter]=useState('all');
  const [selectedWorksBooking,setSelectedWorksBooking]=useState(null);
  const [selectedWorksBookingDetail,setSelectedWorksBookingDetail]=useState(null);
  const [worksBookingsLoading,setWorksBookingsLoading]=useState(false);
  const [workerApplications,setWorkerApplications]=useState([]);
  const [vendorApplications,setVendorApplications]=useState([]);
  const [whatsappWorkerLeads,setWhatsappWorkerLeads]=useState([]);
  const [workers, setWorkers] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminWorkers') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerStatusFilter, setWorkerStatusFilter] = useState('all');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [editingWorker, setEditingWorker] = useState(null);
  const [workerForm, setWorkerForm] = useState({ fullName:'', phone:'', email:'', city:'', pincode:'', requestedSkill:'Electrician', experienceYears:'', serviceRadiusKm:'8', startingPrice:'399', kycStatus:'pending', skillStatus:'pending', accountStatus:'registered', availability:'offline', rating:'0', completedJobs:'0', active:true });

  const [workServices, setWorkServices] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminWorkServices') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return [
    {id:'SVC-ELECTRICIAN',name:'Electrician',icon:'⚡',description:'Electrical repairs and installation',visible:true,active:true,sortOrder:1},
    {id:'SVC-PLUMBER',name:'Plumber',icon:'🚰',description:'Plumbing repairs and fittings',visible:true,active:true,sortOrder:2},
    {id:'SVC-CARPENTER',name:'Carpenter',icon:'🪚',description:'Carpentry and furniture work',visible:true,active:true,sortOrder:3},
    {id:'SVC-PAINTER',name:'Painter',icon:'🎨',description:'Painting and finishing services',visible:true,active:true,sortOrder:4},
    {id:'SVC-AC',name:'AC Service',icon:'❄️',description:'AC service and repair',visible:true,active:true,sortOrder:5},
    {id:'SVC-CLEANING',name:'Cleaning',icon:'🧹',description:'Home and commercial cleaning',visible:true,active:true,sortOrder:6},
    {id:'SVC-REPAIR',name:'Repair',icon:'🔧',description:'General repair services',visible:true,active:true,sortOrder:7}
  ]; } });
  const [serviceForm, setServiceForm] = useState({ name:'', icon:'🛠️', description:'', visible:true, active:true, sortOrder:'' });
  const [editingService, setEditingService] = useState(null);

  const [workerServiceMappings, setWorkerServiceMappings] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiWorkerServiceMappings') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [workerDocuments, setWorkerDocuments] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiWorkerDocuments') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [workAssignments, setWorkAssignments] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiWorkAssignments') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [liveJourneys,setLiveJourneys]=useState([]);
  const [journeyPinInput,setJourneyPinInput]=useState({});
  const [safetyIncidents, setSafetyIncidents] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiSafetyIncidents') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });

  const [vendors, setVendors] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminVendors') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorStatusFilter, setVendorStatusFilter] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendorForm, setVendorForm] = useState({ businessName:'', ownerName:'', phone:'', email:'', businessType:'Individual Creator', city:'', state:'', pincode:'', gstin:'', pan:'', category:'Crochet & Handmade', kycStatus:'pending', payoutStatus:'not_connected', status:'pending', catalogueAccess:false, active:true });
  const [notice, setNotice] = useState('');
  const [logisticsShipments,setLogisticsShipments]=useState([]);
  const [logisticsLoading,setLogisticsLoading]=useState(false);
  const [logisticsQuery,setLogisticsQuery]=useState('');
  const [logisticsStatus,setLogisticsStatus]=useState('all');
  const [logisticsMethod,setLogisticsMethod]=useState('all');
  const [logisticsActionBusy,setLogisticsActionBusy]=useState('');
  const [pickupMappings,setPickupMappings]=useState([]);
  const [pickupMappingsLoading,setPickupMappingsLoading]=useState(false);
  const [pickupCodeDraft,setPickupCodeDraft]=useState({});
  const [pickupMappingBusy,setPickupMappingBusy]=useState('');

  const [logisticsNoteDraft,setLogisticsNoteDraft]=useState({});
  const [shiprocketWebhookEvents,setShiprocketWebhookEvents]=useState([]);
  const [shiprocketWebhookLoading,setShiprocketWebhookLoading]=useState(false);
  const [shiprocketWebhookLastLoaded,setShiprocketWebhookLastLoaded]=useState(null);
  const [deliveryExceptions,setDeliveryExceptions]=useState([]);
  const [deliveryExceptionFilter,setDeliveryExceptionFilter]=useState('OPEN');
  const [deliveryExceptionBusy,setDeliveryExceptionBusy]=useState(false);
  const [deliveryExceptionNotes,setDeliveryExceptionNotes]=useState({});
  const [deliveryExceptionStats,setDeliveryExceptionStats]=useState({});
  const [deliveryExceptionTimeline,setDeliveryExceptionTimeline]=useState({});
  const [deliveryExceptionTimelineOpen,setDeliveryExceptionTimelineOpen]=useState(null);
  const [deliveryHealth,setDeliveryHealth]=useState(null);
  const [deliveryHealthBusy,setDeliveryHealthBusy]=useState(false);
  const [logisticsProviders,setLogisticsProviders]=useState([]);
  const [logisticsZones,setLogisticsZones]=useState([]);
  const [logisticsHubs,setLogisticsHubs]=useState([]);
  const [logisticsProviderBusy,setLogisticsProviderBusy]=useState(false);
  const [settlementSummary,setSettlementSummary]=useState({});
  const [settlementRule,setSettlementRule]=useState(null);
  const [vendorSettlements,setVendorSettlements]=useState([]);
  const [settlementBusy,setSettlementBusy]=useState(false);
  const [settlementRefs,setSettlementRefs]=useState({});
  const [settlementRuleForm,setSettlementRuleForm]=useState({rule_name:'HOWDI Default Settlement',commission_type:'percentage',commission_value:'0',settlement_hold_days:'7',payment_gateway_fee_percent:'0',payment_gateway_fee_flat:'0',tax_withholding_percent:'0'});
  const [settlementTimeline,setSettlementTimeline]=useState({});
  const [settlementTimelineOpen,setSettlementTimelineOpen]=useState(null);
  const [commercialVendors,setCommercialVendors]=useState([]);
  const [commercialSelectedVendor,setCommercialSelectedVendor]=useState('');
  const [commercialBusy,setCommercialBusy]=useState(false);
  const [commercialTimeline,setCommercialTimeline]=useState([]);
  const [negotiationRows,setNegotiationRows]=useState([]);
  const [negotiationSummary,setNegotiationSummary]=useState({totalVendors:0,freePlan:0,offered:0,countered:0,accepted:0,rejected:0,expired:0});
  const [negotiationFilter,setNegotiationFilter]=useState('ALL');
  const [negotiationSearch,setNegotiationSearch]=useState('');
  const [negotiationDetail,setNegotiationDetail]=useState(null);
  const [negotiationLoading,setNegotiationLoading]=useState(false);
  const [productOverrides,setProductOverrides]=useState([]);
  const [platformCharges,setPlatformCharges]=useState([]);
  const [platformChargeTotals,setPlatformChargeTotals]=useState({posted:0,paid:0,waived:0});
  const [commercialBillingBusy,setCommercialBillingBusy]=useState(false);
  const [platformChargeMonth,setPlatformChargeMonth]=useState(new Date().toISOString().slice(0,7));
  const [reconVendors,setReconVendors]=useState([]);
  const [reconVendorId,setReconVendorId]=useState('');
  const [reconMonth,setReconMonth]=useState(new Date().toISOString().slice(0,7));
  const [reconStatement,setReconStatement]=useState(null);
  const [reconNote,setReconNote]=useState('');
  const [reconBusy,setReconBusy]=useState(false);
  const [eligiblePayoutSettlements,setEligiblePayoutSettlements]=useState([]);
  const [selectedPayoutSettlementIds,setSelectedPayoutSettlementIds]=useState([]);
  const [payoutBatches,setPayoutBatches]=useState([]);
  const [payoutBatchDetail,setPayoutBatchDetail]=useState(null);
  const [payoutBusy,setPayoutBusy]=useState(false);
  const [payoutNote,setPayoutNote]=useState('');
  const [hpayAccounts,setHpayAccounts]=useState([]);
  const [hpayBusy,setHpayBusy]=useState(false);
  const [workerHpayRows,setWorkerHpayRows]=useState([]);
  const [workerHpayBusy,setWorkerHpayBusy]=useState(false);
  const [learnEarnOverview,setLearnEarnOverview]=useState(null);
  const [learnEarnBusy,setLearnEarnBusy]=useState(false);
  const [learnRewardForm,setLearnRewardForm]=useState({course_id:'',reward_amount:'',reward_status:'DISABLED',admin_note:''});
  const [universalPayoutControl,setUniversalPayoutControl]=useState(null);
  const [universalPayoutBusy,setUniversalPayoutBusy]=useState(false);
  const [selectedUniversalSettlements,setSelectedUniversalSettlements]=useState([]);
  const [universalPayoutProgram,setUniversalPayoutProgram]=useState('worker_services');
  const [universalPayoutReference,setUniversalPayoutReference]=useState('');
  const [universalPayoutNote,setUniversalPayoutNote]=useState('');
  const [hpayReconciliation,setHpayReconciliation]=useState(null);
  const [hpayReconBusy,setHpayReconBusy]=useState(false);
  const [financeClose,setFinanceClose]=useState(null);
  const [financeCloseBusy,setFinanceCloseBusy]=useState(false);
  const [financeCloseForm,setFinanceCloseForm]=useState({period_start:'',period_end:'',note:''});
  const [hpayExceptionControl,setHpayExceptionControl]=useState(null);
  const [hpayExceptionBusy,setHpayExceptionBusy]=useState(false);
  const [hpayExceptionAssignee,setHpayExceptionAssignee]=useState('Finance Team');
  const [hpayExceptionNote,setHpayExceptionNote]=useState('');
  const [hpayAdjustmentControl,setHpayAdjustmentControl]=useState(null);
  const [hpayAdjustmentBusy,setHpayAdjustmentBusy]=useState(false);
  const [hpayAdjustmentForm,setHpayAdjustmentForm]=useState({
    original_close_id:'',
    program_key:'vendor_commerce',
    adjustment_type:'CORRECTION',
    amount:'',
    source_reference:'',
    reason:''
  });
  const [hpayAdjustmentNote,setHpayAdjustmentNote]=useState('');
  const [financeStatementPack,setFinanceStatementPack]=useState(null);
  const [financeStatementBusy,setFinanceStatementBusy]=useState(false);
  const [financeStatementCloseId,setFinanceStatementCloseId]=useState('');
  const [hpayParticipants,setHpayParticipants]=useState(null);
  const [hpayParticipant360,setHpayParticipant360]=useState(null);
  const [hpayParticipantSearch,setHpayParticipantSearch]=useState('');
  const [hpayParticipantBusy,setHpayParticipantBusy]=useState(false);
  const [hpayParticipantStatementFrom,setHpayParticipantStatementFrom]=useState('');
  const [hpayParticipantStatementTo,setHpayParticipantStatementTo]=useState('');
  const [hpayParticipantStatementProgram,setHpayParticipantStatementProgram]=useState('all');
  const [productOverrideForm,setProductOverrideForm]=useState({
    vendor_profile_id:'',
    product_id:'',
    commission_type:'percentage',
    commission_value:'0',
    commission_min_amount:'',
    commission_max_amount:'',
    negotiation_days:'7',
    reason:'',
    admin_note:''
  });
  const [commercialOfferForm,setCommercialOfferForm]=useState({
    agreement_name:'HOWDI Negotiated Commercial Plan',
    commission_type:'percentage',
    commission_value:'0',
    commission_min_amount:'',
    commission_max_amount:'',
    free_commission_days:'0',
    settlement_cycle_days:'7',
    negotiation_days:'7',
    tier_1_monthly_fee:'0',
    tier_2_monthly_fee:'0',
    tier_3_monthly_fee:'0',
    vendor_discount_cap_percent:'0',
    howdi_funded_discount_allowed:true,
    admin_note:''
  });
  const [trackingReconcileBusy,setTrackingReconcileBusy]=useState(false);
  const [trackingReconcileRuns,setTrackingReconcileRuns]=useState([]);
  const [trackingHistoryBusy,setTrackingHistoryBusy]=useState(false);

  const [search, setSearch] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name:'', icon:'🧶', description:'', visible:true, showOnHome:true });
  const [subcategoryForm, setSubcategoryForm] = useState({ categoryId:'', name:'', icon:'🧶', visible:true });
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [identityHistory, setIdentityHistory] = useState([]);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // PRODUCT STUDIO — structured, media-first product creation.
  const mediaInputRef = useRef(null);
  const blankProductForm = () => ({
    icon:'🧶',
    name:'',
    summary:'',
    description:'',
    brand:'',
    productType:'',
    sku:'',
    barcode:'',
    hsnCode:'',
    categoryId:'',
    subcategoryId:'',
    tags:'',
    media:[],
    specifications:[],
    usage:'',
    care:'',
    material:'',
    sizeType:'standard',
    freeSize:false,
    washable:false,
    washType:'',
    ironable:false,
    ironTemperature:'',
    unit:'piece',
    netWeight:'',
    packageLength:'',
    packageWidth:'',
    packageHeight:'',
    stock:'',
    lowStockThreshold:'5',
    inventoryType:'simple',
    mrp:'',
    sellingPrice:'',
    offerPrice:'',
    costPrice:'',
    gstPercent:'',
    platformChargePercent:'',
    appliedOfferCode:'',
    deliveryMode:'platform',
    deliveryCharge:'',
    freeDeliveryAbove:'',
    returnable:true,
    returnDays:'7',
    customizationAvailable:false,
    customizationNote:'',
    status:'active',
    visible:true,
    featured:false,
    newArrival:false,
    bestSeller:false,
    offerProduct:false
  });
  const [productStudioOpen, setProductStudioOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(blankProductForm);
  const [productStudioSection, setProductStudioSection] = useState('media');

  const [coupons, setCoupons] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('howdiAdminCoupons') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [couponSearch, setCouponSearch] = useState('');
  const [couponForm, setCouponForm] = useState({ code:'', campaignName:'', discountType:'percentage', discountValue:'', minimumOrderValue:'', maximumDiscount:'', startDate:'', endDate:'', usageLimit:'', perCustomerLimit:'1', firstOrderOnly:false, active:true });
  const [editingCoupon, setEditingCoupon] = useState(null);

  const headers = useMemo(() => ({ 'Content-Type':'application/json', 'x-howdi-admin-token':token }), [token]);

  async function api(path, options={}) {
    const response = await fetch(`${API}${path}`, { ...options, headers:{ ...headers, ...(options.headers||{}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if(response.status===401 && data.code==="ADMIN_SESSION_REQUIRED"){
        localStorage.removeItem('howdiAdminToken');
        setToken('');
      }
      const message = data.detail ? `${data.message || 'Request failed'} — ${data.detail}` : (data.message || 'Request failed');
      const error = new Error(message);
      error.status = response.status;
      error.detail = data.detail || '';
      throw error;
    }
    return data;
  }

  async function loadPickupMappings(){
    setPickupMappingsLoading(true);
    try{
      const data=await api('/api/admin/logistics/pickup-mappings');
      const rows=Array.isArray(data.vendors)?data.vendors:[];
      setPickupMappings(rows);
      setPickupCodeDraft(prev=>{
        const next={...prev};
        rows.forEach(v=>{ if(next[v.vendor_profile_id]===undefined) next[v.vendor_profile_id]=v.shiprocket_pickup_code||''; });
        return next;
      });
    }catch(error){
      setNotice(`Pickup mapping: ${error.message}`);
    }finally{
      setPickupMappingsLoading(false);
    }
  }

  async function savePickupMapping(vendorId){
    setPickupMappingBusy(String(vendorId));
    try{
      const data=await api(`/api/admin/logistics/pickup-mappings/${vendorId}`,{
        method:'PUT',
        body:JSON.stringify({shiprocketPickupCode:pickupCodeDraft[vendorId]||''})
      });
      setNotice(data.message||'Pickup mapping saved.');
      await loadPickupMappings();
    }catch(error){
      setNotice(`Pickup mapping failed: ${error.message}`);
    }finally{
      setPickupMappingBusy('');
    }
  }

  async function removePickupMapping(vendorId){
    setPickupMappingBusy(String(vendorId));
    try{
      const data=await api(`/api/admin/logistics/pickup-mappings/${vendorId}/unmap`,{method:'POST'});
      setNotice(data.message||'Pickup mapping removed.');
      await loadPickupMappings();
    }catch(error){
      setNotice(`Pickup unmap failed: ${error.message}`);
    }finally{
      setPickupMappingBusy('');
    }
  }

  async function loadLogistics(){
    setLogisticsLoading(true);
    try{
      const qs=new URLSearchParams();
      if(logisticsQuery.trim())qs.set('q',logisticsQuery.trim());
      if(logisticsStatus!=='all')qs.set('status',logisticsStatus);
      if(logisticsMethod!=='all')qs.set('deliveryMethod',logisticsMethod);
      const data=await api(`/api/admin/logistics/shipments?${qs.toString()}`);
      setLogisticsShipments(Array.isArray(data.shipments)?data.shipments:[]);
      setNotice('');
    }catch(error){
      setNotice(`Logistics: ${error.message}`);
    }finally{
      setLogisticsLoading(false);
    }
  }

  async function runLogisticsAction(shipmentId,action){
    setLogisticsActionBusy(`${shipmentId}:${action}`);
    try{
      const data=await api(`/api/admin/logistics/shipments/${shipmentId}/${action}`,{method:'POST'});
      setNotice(data.message||'Logistics updated.');
      await loadLogistics();
    }catch(error){
      setNotice(`Logistics action failed: ${error.message}`);
    }finally{
      setLogisticsActionBusy('');
    }
  }

  async function saveLogisticsNote(shipmentId){
    setLogisticsActionBusy(`${shipmentId}:note`);
    try{
      const data=await api(`/api/admin/logistics/shipments/${shipmentId}/note`,{
        method:'PUT',body:JSON.stringify({note:logisticsNoteDraft[shipmentId]||''})
      });
      setNotice(data.message||'Admin note saved.');
      await loadLogistics();
    }catch(error){
      setNotice(`Admin note failed: ${error.message}`);
    }finally{
      setLogisticsActionBusy('');
    }
  }


  async function loadShiprocketWebhookEvents(){
    setShiprocketWebhookLoading(true);
    try{
      const data=await api('/api/admin/logistics/shiprocket-webhooks');
      setShiprocketWebhookEvents(Array.isArray(data.events)?data.events:[]);
      setShiprocketWebhookLastLoaded(new Date());
      setNotice('');
    }catch(error){
      setNotice(`Shiprocket webhook activity: ${error.message}`);
    }finally{
      setShiprocketWebhookLoading(false);
    }
  }

  async function retryShiprocketWebhookEvent(id){
    setShiprocketWebhookLoading(true);
    try{
      const data=await api(`/api/admin/logistics/shiprocket-webhooks/${id}/retry`,{method:'POST'});
      setNotice(data.message||'Webhook event reconciled');
      await loadShiprocketWebhookEvents();
      await loadLogistics();
    }catch(error){
      setNotice(`Webhook retry: ${error.message}`);
    }finally{
      setShiprocketWebhookLoading(false);
    }
  }

  async function retryPendingShiprocketWebhooks(){
    setShiprocketWebhookLoading(true);
    try{
      const data=await api('/api/admin/logistics/shiprocket-webhooks/retry-pending',{method:'POST'});
      setNotice(`${data.message}. Processed ${data.processed||0}; remaining ${data.remaining||0}.`);
      await loadShiprocketWebhookEvents();
      await loadLogistics();
    }catch(error){
      setNotice(`Webhook reconciliation: ${error.message}`);
    }finally{
      setShiprocketWebhookLoading(false);
    }
  }



  async function loadDeliveryExceptions(filter=deliveryExceptionFilter){
    setDeliveryExceptionBusy(true);
    try{
      const [data,statsData]=await Promise.all([
        api(`/api/admin/logistics/exceptions?status=${encodeURIComponent(filter)}`),
        api('/api/admin/logistics/exceptions/stats')
      ]);
      setDeliveryExceptions(Array.isArray(data.exceptions)?data.exceptions:[]);
      setDeliveryExceptionStats(statsData.stats||{});
    }catch(error){setNotice(`Delivery exceptions: ${error.message}`);}
    finally{setDeliveryExceptionBusy(false);}
  }
  async function updateDeliveryException(id,action){
    setDeliveryExceptionBusy(true);
    try{const data=await api(`/api/admin/logistics/exceptions/${id}/${action}`,{method:'POST',body:JSON.stringify({note:deliveryExceptionNotes[id]||''})});setNotice(data.message||'Delivery exception updated');await loadDeliveryExceptions();}
    catch(error){setNotice(`Delivery exception: ${error.message}`);} finally{setDeliveryExceptionBusy(false);}
  }



  async function saveDeliveryExceptionWorkflow(id,action){
    setDeliveryExceptionBusy(true);
    try{
      const data=await api(`/api/admin/logistics/exceptions/${id}/workflow`,{
        method:'POST',
        body:JSON.stringify({action,note:deliveryExceptionNotes[id]||''})
      });
      setNotice(data.message||'Exception workflow updated');
      await loadDeliveryExceptions(deliveryExceptionFilter);
      if(deliveryExceptionTimelineOpen===id)await loadDeliveryExceptionTimeline(id);
    }catch(error){setNotice(`Exception workflow: ${error.message}`);}
    finally{setDeliveryExceptionBusy(false);}
  }

  async function loadDeliveryExceptionTimeline(id){
    try{
      const data=await api(`/api/admin/logistics/exceptions/${id}/timeline`);
      setDeliveryExceptionTimeline(v=>({...v,[id]:Array.isArray(data.events)?data.events:[]}));
      setDeliveryExceptionTimelineOpen(id);
    }catch(error){setNotice(`Exception timeline: ${error.message}`);}
  }




  async function loadVendorSettlements(){
    setSettlementBusy(true);
    try{
      const [summaryData,listData]=await Promise.all([
        api('/api/admin/settlements/summary'),
        api('/api/admin/settlements')
      ]);
      setSettlementSummary(summaryData.summary||{});
      const rule=summaryData.defaultRule||null;
      setSettlementRule(rule);
      if(rule)setSettlementRuleForm({
        rule_name:rule.rule_name||'HOWDI Default Settlement',
        commission_type:rule.commission_type||'percentage',
        commission_value:String(rule.commission_value??0),
        settlement_hold_days:String(rule.settlement_hold_days??7),
        payment_gateway_fee_percent:String(rule.payment_gateway_fee_percent??0),
        payment_gateway_fee_flat:String(rule.payment_gateway_fee_flat??0),
        tax_withholding_percent:String(rule.tax_withholding_percent??0)
      });
      setVendorSettlements(Array.isArray(listData.settlements)?listData.settlements:[]);
      setNotice('Vendor settlements loaded');
    }catch(error){
      setNotice(`Vendor settlements: ${error.message}`);
    }finally{setSettlementBusy(false);}
  }

  async function generateVendorSettlements(){
    setSettlementBusy(true);
    try{
      const data=await api('/api/admin/settlements/generate',{method:'POST',body:'{}'});
      setNotice(data.message||'Settlements generated');
      await loadVendorSettlements();
    }catch(error){setNotice(`Settlement generation: ${error.message}`);}
    finally{setSettlementBusy(false);}
  }

  async function updateVendorSettlement(id,action){
    setSettlementBusy(true);
    try{
      const body={};
      if(action==='mark-paid')body.payout_reference=settlementRefs[id]||'';
      const data=await api(`/api/admin/settlements/${id}/${action}`,{
        method:'POST',body:JSON.stringify(body)
      });
      setNotice(data.message||'Settlement updated');
      await loadVendorSettlements();
    }catch(error){setNotice(`Settlement update: ${error.message}`);}
    finally{setSettlementBusy(false);}
  }


  async function saveSettlementRule(){
    setSettlementBusy(true);
    try{
      const data=await api('/api/admin/settlements/rule',{
        method:'PUT',
        body:JSON.stringify({
          ...settlementRuleForm,
          commission_value:Number(settlementRuleForm.commission_value||0),
          settlement_hold_days:Number(settlementRuleForm.settlement_hold_days||0),
          payment_gateway_fee_percent:Number(settlementRuleForm.payment_gateway_fee_percent||0),
          payment_gateway_fee_flat:Number(settlementRuleForm.payment_gateway_fee_flat||0),
          tax_withholding_percent:Number(settlementRuleForm.tax_withholding_percent||0)
        })
      });
      setSettlementRule(data.rule||null);
      setNotice(data.message||'Settlement rule saved');
      await loadVendorSettlements();
    }catch(error){setNotice(`Settlement rule: ${error.message}`);}
    finally{setSettlementBusy(false);}
  }

  async function loadSettlementTimeline(id){
    try{
      const data=await api(`/api/admin/settlements/${id}/timeline`);
      setSettlementTimeline(v=>({...v,[id]:Array.isArray(data.events)?data.events:[]}));
      setSettlementTimelineOpen(id);
    }catch(error){setNotice(`Settlement timeline: ${error.message}`);}
  }

















  async function loadPaymentTransactions(){
    setPaymentLedgerLoading(true);
    try{
      const params=new URLSearchParams();
      if(paymentSearch.trim())params.set('search',paymentSearch.trim());
      if(paymentStatusFilter!=='all')params.set('status',paymentStatusFilter);
      const data=await api(`/api/admin/payments/transactions${params.toString()?`?${params.toString()}`:''}`);
      const payload=data.payments||{};
      const rows=(payload.rows||[]).map(row=>({
        id:row.transaction_code||`PAY-${row.id}`,
        dbId:row.id,
        orderId:row.order_id,
        orderNumber:row.order_number||row.order_id||'—',
        customerName:row.customer_name||'Customer',
        howdiId:row.howdi_id||'',
        amount:Number(row.amount||0),
        method:row.method||'Pending',
        status:String(row.status||'PENDING').toLowerCase(),
        createdAt:row.created_at||Date.now(),
        reference:row.provider_payment_id||row.reference||'Awaiting gateway reference',
        provider:row.provider||'HOWDI',
        source:row.source||'ORDER_BACKFILL',
        providerPaymentId:row.provider_payment_id||'',
        providerEventId:row.provider_event_id||'',
        events:Array.isArray(row.events)?row.events:[],
        orderPaymentStatus:String(row.order_payment_status||'').toLowerCase(),
        rawTransaction:row
      }));
      setPaymentTransactions(rows);
      setPaymentLedgerSummary(payload.summary||null);
    }catch(error){
      setNotice(`Payments ledger: ${error.message}`);
    }finally{
      setPaymentLedgerLoading(false);
    }
  }


  async function loadPaymentRefundControl(payment=selectedPayment){
    if(!payment?.dbId){setPaymentRefundControl(null);return;}
    setPaymentRefundBusy(true);
    try{
      const data=await api(`/api/admin/payments/transactions/${payment.dbId}/refunds`);
      setPaymentRefundControl(data.refundControl||null);
    }catch(error){
      setNotice(`Refund control: ${error.message}`);
    }finally{
      setPaymentRefundBusy(false);
    }
  }

  async function createPaymentRefundRequest(){
    if(!selectedPayment?.dbId){setNotice('Open a PostgreSQL payment ledger transaction first');return;}
    const amount=Number(paymentRefundAmount||0);
    if(!amount||amount<=0){setNotice('Enter a valid refund amount');return;}
    if(!paymentRefundReason.trim()){setNotice('Refund reason is required');return;}

    setPaymentRefundBusy(true);
    try{
      await api(`/api/admin/payments/transactions/${selectedPayment.dbId}/refunds`,{
        method:'POST',
        body:JSON.stringify({
          amount,
          reason:paymentRefundReason.trim(),
          actor:'ADMIN'
        })
      });
      setPaymentRefundAmount('');
      setPaymentRefundReason('');
      setNotice('Refund request created. No gateway money movement has been triggered.');
      await loadPaymentRefundControl(selectedPayment);
    }catch(error){
      setNotice(`Refund request failed: ${error.message}`);
    }finally{
      setPaymentRefundBusy(false);
    }
  }

  async function paymentRefundAction(refund,action){
    let payload={actor:'ADMIN'};

    if(action==='reject'||action==='failed'){
      const note=window.prompt(action==='reject'?'Enter rejection reason':'Enter failure reason');
      if(!note)return;
      payload.note=note;
    }

    if(action==='processed'){
      const external_refund_reference=window.prompt('Enter external gateway refund reference / UTR');
      if(!external_refund_reference)return;
      payload.external_refund_reference=external_refund_reference;
    }

    setPaymentRefundBusy(true);
    try{
      await api(`/api/admin/payments/refunds/${refund.id}/${action}`,{
        method:'POST',
        body:JSON.stringify(payload)
      });
      setNotice(`Refund ${action.replace('_',' ')} recorded successfully.`);
      await loadPaymentRefundControl(selectedPayment);
      await loadPaymentTransactions();
    }catch(error){
      setNotice(`Refund workflow failed: ${error.message}`);
    }finally{
      setPaymentRefundBusy(false);
    }
  }



  async function loadTeacherFoundation(){
    setTeacherFoundationBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/teachers');
      setTeacherFoundation({teachers:Array.isArray(data.teachers)?data.teachers:[],summary:data.summary||{}});
    }catch(error){setNotice(`Teacher Foundation: ${error.message}`);}
    finally{setTeacherFoundationBusy(false);}
  }

  async function teacherFoundationAction(teacher,action){
    let note='';
    if(['changes-required','reject','suspend'].includes(action)){
      note=window.prompt(action==='changes-required'?'Tell the teacher what must be updated:':'Add an admin reason:')||'';
      if(!note.trim())return;
    }
    setTeacherFoundationBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/teachers/${teacher.id}/${action}`,{method:'POST',body:JSON.stringify({note,actor:'HOWDI Admin'})});
      setNotice(data.message||'Teacher status updated');
      await loadTeacherFoundation();
    }catch(error){setNotice(`Teacher approval: ${error.message}`);}
    finally{setTeacherFoundationBusy(false);}
  }

  async function teacherComplianceAction(teacher,area,action){
    let note='';
    if(['fail','hold'].includes(action)){
      note=window.prompt(area==='kyc'?'Add KYC verification reason:':'Add payout hold reason:')||'';
      if(!note.trim())return;
    }
    setTeacherFoundationBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/teachers/${teacher.id}/${area}/${action}`,{method:'POST',body:JSON.stringify({note,actor:'HOWDI Admin'})});
      setNotice(data.message||'Teacher compliance updated');
      await loadTeacherFoundation();
    }catch(error){setNotice(`Teacher compliance: ${error.message}`);}
    finally{setTeacherFoundationBusy(false);}
  }

  async function loadTeacherDisputeAdjustments(){
    setTeacherDisputeAdjustmentBusy(true);
    try{
      const d=await api('/api/admin/learn-earn/teacher-dispute-adjustments');
      setTeacherDisputeAdjustments({summary:d.summary||{},closed_periods:d.closed_periods||[],cases:d.cases||[]});
    }catch(error){setNotice(`Finance Adjustment Bridge: ${error.message}`);}
    finally{setTeacherDisputeAdjustmentBusy(false);}
  }

  function startTeacherDisputeAdjustment(item){
    setTeacherDisputeAdjustmentDraft({
      case_id:item.case_id,
      original_close_id:'',
      adjustment_type:'CORRECTION',
      amount:'',
      reason:item.resolution||''
    });
  }

  async function createTeacherDisputeAdjustment(){
    const d=teacherDisputeAdjustmentDraft;
    if(!d.case_id||!d.original_close_id||!Number(d.amount)){setNotice('Choose a closed period and enter a non-zero adjustment amount.');return;}
    setTeacherDisputeAdjustmentBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/teacher-statement-cases/${d.case_id}/finance-adjustment`,{
        method:'POST',body:JSON.stringify(d)
      });
      setNotice(data.message||'Draft finance adjustment created.');
      setTeacherDisputeAdjustmentDraft({case_id:null,original_close_id:'',adjustment_type:'CORRECTION',amount:'',reason:''});
      await loadTeacherDisputeAdjustments();await loadTeacherStatementCases();loadTeacherCaseAnalytics();loadV1933Ops();loadV1937Duplicates();loadV1945Governance();loadV1949Governance();loadV1953Acceptance();loadV1957Effectiveness();loadV1961Prevention();loadV1965PreventionControl();loadV1975Completion();loadV1985GateData();loadV1995RecapControl();loadV2005Finalization();loadV2006Compensation();loadTeacherDisputeAdjustments();
    }catch(error){setNotice(`Finance Adjustment Bridge: ${error.message}`);}
    finally{setTeacherDisputeAdjustmentBusy(false);}
  }

  async function transitionTeacherDisputeAdjustment(item,action){
    const note=window.prompt(`Optional note for ${action}:`,'')||'';
    setTeacherDisputeAdjustmentBusy(true);
    try{
      const d=await api(`/api/admin/learn-earn/teacher-dispute-adjustments/${item.adjustment_id}/${action}`,{
        method:'POST',body:JSON.stringify({note})
      });
      setNotice(d.message||'Finance adjustment updated.');
      await loadTeacherDisputeAdjustments();await loadTeacherStatementCases();
    }catch(error){setNotice(`Finance Adjustment Bridge: ${error.message}`);}
    finally{setTeacherDisputeAdjustmentBusy(false);}
  }

  async function loadV2006Compensation(){
    try{
      const [d,t,v]=await Promise.all([
        api('/api/admin/learn-earn/teacher-compensation'),
        api('/api/admin/learn-earn/teachers'),
        api('/api/admin/learn-earn/teacher-delivery-validation')
      ]);
      setV2006Comp(d.agreements||[]);
      setV2017CompCalculations(d.calculations||[]);
      setV2010Teachers(t.teachers||[]);
      setTeacherDeliveryControl({summary:v.summary||{},direct:v.direct||[],groups:v.groups||[],recent:v.recent||[]});
    }catch(error){setNotice(`Compensation: ${error.message}`);}
  }
  async function createV2006Agreement(){
    if(!v2010CompForm.teacher_profile_id)return setNotice('Select a teacher.');
    setV2010CompBusy(true);
    try{
      const payload={...v2010CompForm};
      ['hourly_rate','session_rate','course_amount','learner_rate','fixed_amount'].forEach(k=>payload[k]=Number(payload[k]||0));
      payload.course_id=payload.course_id?Number(payload.course_id):null;
      payload.batch_id=payload.batch_id?Number(payload.batch_id):null;
      if(!payload.effective_from)delete payload.effective_from;if(!payload.effective_to)delete payload.effective_to;
      const d=await api('/api/admin/learn-earn/teacher-compensation',{method:'POST',body:JSON.stringify(payload)});
      setNotice(d.message);
      setV2010CompForm(x=>({...x,hourly_rate:'',session_rate:'',course_amount:'',learner_rate:'',fixed_amount:'',course_id:'',batch_id:'',terms_note:''}));
      await loadV2006Compensation();
    }catch(error){setNotice(error.message);}finally{setV2010CompBusy(false);}
  }
  async function setV2010CompStatus(id,status){
    try{const d=await api(`/api/admin/learn-earn/teacher-compensation/${id}/status`,{method:'POST',body:JSON.stringify({status})});setNotice(d.message);await loadV2006Compensation();}catch(error){setNotice(error.message);}
  }

  function selectV2018CompDelivery(item){
    const type=String(item.delivery_type||'DIRECT').toUpperCase();
    const accepted=v2006Comp.find(x=>
      String(x.teacher_profile_id)===String(item.teacher_profile_id) &&
      x.status==='ACTIVE' && x.teacher_acceptance==='ACCEPTED'
    );
    const startRaw=item.scheduled_start||item.starts_at;
    const endRaw=item.scheduled_end||item.ends_at;
    let scheduledMinutes=0;
    if(startRaw&&endRaw){
      const ms=new Date(endRaw)-new Date(startRaw);
      if(Number.isFinite(ms)&&ms>0)scheduledMinutes=Math.round(ms/60000);
    }
    const validatedMinutes=type==='DIRECT'
      ? Number(item.attended_minutes||scheduledMinutes||0)
      : Number(item.attended_minutes||scheduledMinutes||0);
    const eligibleLearners=type==='GROUP'
      ? Number(item.attended_count||0)
      : 1;
    setV2017CalcForm({
      agreement_id:accepted?String(accepted.id):'',
      delivery_type:type,
      delivery_reference:String(item.source_id||''),
      validated_minutes:String(validatedMinutes||0),
      validated_sessions:'1',
      eligible_learners:String(eligibleLearners||0),
      course_completion_percent:''
    });
    if(!accepted){
      setNotice(`No ACTIVE + ACCEPTED compensation agreement found for ${item.teacher_name||'this teacher'}. Create/activate the agreement first.`);
    }else{
      setNotice(`Selected ${type==='DIRECT'?(item.booking_code||'direct class'):(item.session_code||'group class')} and matched ${accepted.model} agreement.`);
    }
    document.getElementById('v2018-comp-calc-form')?.scrollIntoView({behavior:'smooth',block:'center'});
  }

  async function calculateV2017Compensation(){
    if(!v2017CalcForm.agreement_id||!v2017CalcForm.delivery_reference.trim())return setNotice('Agreement and delivery reference are required.');
    setV2017CalcBusy(true);
    try{
      const payload={...v2017CalcForm,
        agreement_id:Number(v2017CalcForm.agreement_id),
        validated_minutes:Number(v2017CalcForm.validated_minutes||0),
        validated_sessions:Number(v2017CalcForm.validated_sessions||0),
        eligible_learners:Number(v2017CalcForm.eligible_learners||0),
        course_completion_percent:Number(v2017CalcForm.course_completion_percent||0)
      };
      const d=await api('/api/admin/learn-earn/teacher-compensation/calculate',{method:'POST',body:JSON.stringify(payload)});
      setNotice(`${d.message} ₹${Number(d.calculation?.calculated_amount||0).toLocaleString('en-IN')}`);
      await loadV2006Compensation();
    }catch(error){setNotice(error.message);}finally{setV2017CalcBusy(false);}
  }
  async function validateV2017Compensation(item){
    if(!window.confirm(`Validate ₹${Number(item.calculated_amount||0).toLocaleString('en-IN')} for this completed ${item.delivery_type} delivery and create the governed teacher earning?`))return;
    setV2017CalcBusy(true);
    try{
      const d=await api(`/api/admin/learn-earn/teacher-compensation/calculations/${item.id}/validate`,{method:'POST',body:'{}'});
      setNotice(d.message);
      await loadV2006Compensation();
      try{await loadV1917DeliveryValidation();}catch(_){}
    }catch(error){setNotice(error.message);}finally{setV2017CalcBusy(false);}
  }

  async function loadV2005Finalization(){
    try{
      const [f,p,o,m,s,i,c,q,r,z]=await Promise.all([
        api('/api/admin/learn-earn/freeze/history'),
        api('/api/admin/learn-earn/recap-pack/history'),
        api('/api/admin/learn-earn/final-open-items'),
        api('/api/admin/learn-earn/ownership-closure-matrix'),
        api('/api/admin/learn-earn/final-scorecard'),
        api('/api/admin/learn-earn/data-integrity-check'),
        api('/api/admin/learn-earn/capability-inventory'),
        api('/api/admin/learn-earn/manual-qa'),
        api('/api/admin/learn-earn/production-readiness/latest'),
        api('/api/admin/learn-earn/completion-seal/latest')
      ]);
      setV2005Freezes(f.freezes||[]);setV2005Packs(p.packs||[]);setV2005OpenItems(o.items||[]);setV2005Matrix(m||{gaps:[],blockers:[]});setV2005Scorecard(s.scorecard||{});setV2005Integrity(i.checks||[]);setV2005Capabilities(c.capabilities||[]);setV2005Qa(q.checks||[]);setV2005Readiness(r.decision||null);setV2005Seal(z.seal||null);
    }catch(error){setNotice(`Finalization: ${error.message}`);}
  }
  async function addV2005OpenItem(){const title=window.prompt('Final open item:','')||'';if(!title.trim())return;try{const d=await api('/api/admin/learn-earn/final-open-items',{method:'POST',body:JSON.stringify({title,severity:'MEDIUM',area:'FINAL_RECAP'})});setNotice(d.message);await loadV2005Finalization();}catch(error){setNotice(error.message);}}
  async function closeV2005OpenItem(x){const note=window.prompt('Closure note:','')||'';try{const d=await api(`/api/admin/learn-earn/final-open-items/${x.id}/close`,{method:'POST',body:JSON.stringify({note})});setNotice(d.message);await loadV2005Finalization();}catch(error){setNotice(error.message);}}
  async function updateV2005Qa(x,status){const note=window.prompt('Evidence / verification note:','')||'';try{const d=await api(`/api/admin/learn-earn/manual-qa/${x.id}/status`,{method:'POST',body:JSON.stringify({status,note})});setNotice(d.message);await loadV2005Finalization();}catch(error){setNotice(error.message);}}
  async function decideV2005Readiness(){const note=window.prompt('Production readiness note:','')||'';try{const d=await api('/api/admin/learn-earn/production-readiness/decide',{method:'POST',body:JSON.stringify({note})});setV2005Readiness(d.decision);setNotice(`${d.decision.decision} · ${d.decision.score}/100`);}catch(error){setNotice(error.message);}}
  async function sealV2005(){const note=window.prompt('Completion seal note:','Learn & Earn ready for full HOWDI recap and patch cycle')||'';try{const d=await api('/api/admin/learn-earn/completion-seal',{method:'POST',body:JSON.stringify({note})});setV2005Seal(d.seal);setNotice(d.message);}catch(error){setNotice(error.message);}}

  async function loadV1995RecapControl(){
    try{
      const [h,d,t,r,p,f]=await Promise.all([
        api('/api/admin/learn-earn/completion-gate/history'),
        api('/api/admin/learn-earn/dual-control/queue'),
        api('/api/admin/learn-earn/teacher-trust/trends'),
        api('/api/admin/learn-earn/risk-heatmap'),
        api('/api/admin/learn-earn/recap-pack/latest'),
        api('/api/admin/learn-earn/freeze/latest')
      ]);
      setV1995History(h.runs||[]);setV1995DualQueue(d.queue||[]);setV1995Trends(t.trends||[]);setV1995Heatmap(r.cells||[]);setV1995Recap(p.pack||null);setV1995Freeze(f.freeze||null);
    }catch(error){setNotice(`Recap Control: ${error.message}`);}
  }
  async function updateV1995Gap(x,status){const note=window.prompt('Gap note:','')||'';try{const d=await api(`/api/admin/learn-earn/readiness-gaps/${x.id}/status`,{method:'POST',body:JSON.stringify({status,note})});setNotice(d.message);await loadV1985GateData();}catch(error){setNotice(error.message);}}
  async function updateV1995Blocker(x,status){const note=window.prompt('Blocker note:','')||'';try{const d=await api(`/api/admin/learn-earn/launch-blockers/${x.id}/status`,{method:'POST',body:JSON.stringify({status,note})});setNotice(d.message);await loadV1985GateData();}catch(error){setNotice(error.message);}}
  async function snapshotV1995Trust(){try{const d=await api('/api/admin/learn-earn/teacher-trust/snapshot',{method:'POST',body:'{}'});setNotice(d.message);await loadV1995RecapControl();}catch(error){setNotice(error.message);}}
  async function buildV1995Recap(){try{const d=await api('/api/admin/learn-earn/recap-pack/build',{method:'POST',body:'{}'});setV1995Recap(d.pack);setNotice('Recap readiness pack created.');}catch(error){setNotice(error.message);}}
  async function freezeV1995(){const note=window.prompt('Freeze note:','90% Learn & Earn completion checkpoint')||'';try{const d=await api('/api/admin/learn-earn/freeze',{method:'POST',body:JSON.stringify({note})});setV1995Freeze(d.freeze);setNotice(d.message);}catch(error){setNotice(error.message);}}

  async function loadV1985GateData(){
    try{const [g,bx,tr,ei,li,sc]=await Promise.all([api('/api/admin/learn-earn/readiness-gaps'),api('/api/admin/learn-earn/launch-blockers'),api('/api/admin/learn-earn/teacher-trust-index'),api('/api/admin/learn-earn/earnings-integrity-summary'),api('/api/admin/learn-earn/learner-outcome-integrity'),api('/api/admin/learn-earn/executive-scorecard')]);setV1985Gaps(g.gaps||[]);setV1985Blockers(bx.blockers||[]);setV1985Trust(tr||{summary:{},teachers:[]});setV1985Integrity(ei.summary||{});setV1985LearnerIntegrity(li.checks||[]);setV1985Scorecard(sc.scorecard||{});}
    catch(error){setNotice(`90% Gate: ${error.message}`);}
  }
  async function runV1985Gate(){try{const d=await api('/api/admin/learn-earn/completion-gate/run',{method:'POST',body:'{}'});setV1985Gate(d.run);setNotice(`Completion gate: ${d.run.gate_status} · ${d.run.completion_score}/100`);}catch(error){setNotice(`Completion Gate: ${error.message}`);}}
  async function addV1985Gap(){const title=window.prompt('Readiness gap:','')||'';if(!title.trim())return;try{const d=await api('/api/admin/learn-earn/readiness-gaps',{method:'POST',body:JSON.stringify({title,severity:'HIGH'})});setNotice(d.message);await loadV1985GateData();}catch(error){setNotice(error.message);}}
  async function addV1985Blocker(){const title=window.prompt('Launch blocker:','')||'';if(!title.trim())return;try{const d=await api('/api/admin/learn-earn/launch-blockers',{method:'POST',body:JSON.stringify({title,severity:'HIGH',area:'LEARN_EARN'})});setNotice(d.message);await loadV1985GateData();}catch(error){setNotice(error.message);}}

  async function loadV1975Completion(){
    try{
      const [e,r,x,w,c]=await Promise.all([
        api('/api/admin/learn-earn/prevention-effectiveness-analytics'),
        api('/api/admin/learn-earn/teacher-statement-repeat-cases'),
        api('/api/admin/learn-earn/teacher-case-experience'),
        api('/api/admin/learn-earn/teacher-statement-weekly-digest'),
        api('/api/admin/learn-earn/teacher-statement-command-center')
      ]);
      setV1975Effectiveness(e||{summary:{},rows:[]});setV1975RepeatCases(r.candidates||[]);setV1975Experience(x||{summary:{},cases:[]});setV1975Weekly(w||{summary:{}});setV1975Command(c||{summary:{}});
    }catch(error){setNotice(`Completion Governance: ${error.message}`);}
  }
  async function runV1975CapaSla(){try{const d=await api('/api/admin/learn-earn/preventive-actions/run-sla',{method:'POST',body:'{}'});setNotice(d.message);await loadV1961Prevention();}catch(error){setNotice(`CAPA SLA: ${error.message}`);}}
  async function runV1975RepeatScan(){try{const d=await api('/api/admin/learn-earn/teacher-statement-repeat-cases/scan',{method:'POST',body:'{}'});setNotice(d.message);await loadV1975Completion();}catch(error){setNotice(`Repeat Scan: ${error.message}`);}}
  async function applyV1975Playbook(x){
    const case_id=Number(window.prompt('Optional Case ID (0 for root-cause use only)','0')||0),note=window.prompt('Application note:','')||'';
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-prevention-playbooks/${x.id}/apply`,{method:'POST',body:JSON.stringify({case_id,note})});setNotice(d.message);await loadV1965PreventionControl();}
    catch(error){setNotice(`Playbook Apply: ${error.message}`);}
  }
  async function archiveV1975Case(x){
    const action=x.archive_status==='ARCHIVED'?'RESTORE':'ARCHIVE',note=window.prompt(`${action} note:`,'')||'';
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/archive`,{method:'POST',body:JSON.stringify({action,note})});setNotice(d.message);await loadTeacherStatementCases();}
    catch(error){setNotice(`Archive: ${error.message}`);}
  }
  async function runV1975Health(){try{const d=await api('/api/admin/learn-earn/teacher-statement-governance-health/run',{method:'POST',body:'{}'});setV1975Health(d.health);setNotice('Governance health check completed.');}catch(error){setNotice(`Governance Health: ${error.message}`);}}
  async function runV1975Readiness(){try{const d=await api('/api/admin/learn-earn/readiness-audit/run',{method:'POST',body:'{}'});setV1975Readiness(d.audit);setNotice('Learn & Earn readiness audit completed.');}catch(error){setNotice(`Readiness Audit: ${error.message}`);}}

  async function loadV1965PreventionControl(){
    try{const [x,y]=await Promise.all([api('/api/admin/learn-earn/teacher-statement-recurrence-alerts'),api('/api/admin/learn-earn/teacher-statement-prevention-playbooks')]);setV1965Alerts(x.alerts||[]);setV1965Playbooks(y.playbooks||[]);}
    catch(error){setNotice(`Prevention Control: ${error.message}`);}
  }
  async function verifyV1965Capa(x){
    const status=window.prompt('Effectiveness: EFFECTIVE / PARTIAL / INEFFECTIVE','EFFECTIVE');if(!status)return;
    const score=Number(window.prompt('Effectiveness score 0-100','90')||0),note=window.prompt('Verification note:','')||'';
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-preventive-actions/${x.id}/effectiveness`,{method:'POST',body:JSON.stringify({status,score,note})});setNotice(d.message);await loadV1961Prevention();}
    catch(error){setNotice(`CAPA Effectiveness: ${error.message}`);}
  }
  async function scanV1965Alerts(){try{const d=await api('/api/admin/learn-earn/teacher-statement-recurrence-alerts/scan',{method:'POST',body:'{}'});setNotice(d.message);await loadV1965PreventionControl();}catch(error){setNotice(`Recurrence Scan: ${error.message}`);}}
  async function updateV1965Alert(x,status){const note=window.prompt('Alert note:','')||'';try{const d=await api(`/api/admin/learn-earn/teacher-statement-recurrence-alerts/${x.id}/status`,{method:'POST',body:JSON.stringify({status,note})});setNotice(d.message);await loadV1965PreventionControl();}catch(error){setNotice(`Alert: ${error.message}`);}}
  async function createV1965Playbook(){if(!v1965PlaybookForm.root_cause_code.trim()||!v1965PlaybookForm.title.trim()||!v1965PlaybookForm.prevention_steps.trim())return;try{const d=await api('/api/admin/learn-earn/teacher-statement-prevention-playbooks',{method:'POST',body:JSON.stringify(v1965PlaybookForm)});setNotice(d.message);setV1965PlaybookForm({root_cause_code:'',title:'',prevention_steps:'',verification_steps:''});await loadV1965PreventionControl();}catch(error){setNotice(`Playbook: ${error.message}`);}}
  async function governV1965Playbook(x,status){try{const d=await api(`/api/admin/learn-earn/teacher-statement-prevention-playbooks/${x.id}/approval`,{method:'POST',body:JSON.stringify({status})});setNotice(d.message);await loadV1965PreventionControl();}catch(error){setNotice(`Playbook: ${error.message}`);}}

  async function loadV1961Prevention(){
    try{const [r,c,m]=await Promise.all([api('/api/admin/learn-earn/teacher-statement-root-cause-intelligence'),api('/api/admin/learn-earn/teacher-statement-preventive-actions'),api('/api/admin/learn-earn/teacher-statement-recurrence-monitor')]);setV1961RootCause(r||{summary:{},roots:[]});setV1961Capa(c||{summary:{},actions:[]});setV1961Recurrence(m||{summary:{},recurrence:[]});}
    catch(error){setNotice(`Prevention Intelligence: ${error.message}`);}
  }
  async function validateV1961RootCause(x){const root_cause=window.prompt('Validated root cause:',x.root_cause||'')||'';if(!root_cause.trim())return;try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/root-cause`,{method:'POST',body:JSON.stringify({root_cause,confidence:100})});setNotice(d.message);await loadV1961Prevention();await loadTeacherStatementCases();}catch(error){setNotice(`Root Cause: ${error.message}`);}}
  async function createV1961Capa(){if(!v1961CapaForm.root_cause_code.trim()||!v1961CapaForm.title.trim()||!v1961CapaForm.action_text.trim())return;try{const payload={...v1961CapaForm,due_at:v1961CapaForm.due_at?new Date(v1961CapaForm.due_at).toISOString():null};const d=await api('/api/admin/learn-earn/teacher-statement-preventive-actions',{method:'POST',body:JSON.stringify(payload)});setNotice(d.message);setV1961CapaForm({root_cause_code:'',title:'',action_text:'',owner_reference:'',due_at:''});await loadV1961Prevention();}catch(error){setNotice(`Preventive Action: ${error.message}`);}}
  async function updateV1961Capa(x,status){const effectiveness_note=status==='COMPLETED'?(window.prompt('Effectiveness note:','')||''):'';try{const d=await api(`/api/admin/learn-earn/teacher-statement-preventive-actions/${x.id}/status`,{method:'POST',body:JSON.stringify({status,effectiveness_note})});setNotice(d.message);await loadV1961Prevention();}catch(error){setNotice(`Preventive Action: ${error.message}`);}}

  async function loadV1957Effectiveness(){
    try{const d=await api('/api/admin/learn-earn/teacher-resolution-effectiveness');setV1957Effectiveness(d||{summary:{},cases:[]});}
    catch(error){setNotice(`Effectiveness: ${error.message}`);}
  }
  async function governV1957Knowledge(k,decision){
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-resolution-knowledge/${k.id}/approval`,{method:'POST',body:JSON.stringify({decision})});setNotice(d.message);await loadV1949Governance();}
    catch(error){setNotice(`Knowledge Governance: ${error.message}`);}
  }
  async function openV1957Blockers(x){
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/blockers`);setV1957Blockers({case_id:x.id,items:d.blockers||[]});setV1957BlockerForm({blocker_type:'DEPENDENCY',title:'',owner_reference:'',due_at:''});}
    catch(error){setNotice(`Blockers: ${error.message}`);}
  }
  async function addV1957Blocker(){
    if(!v1957Blockers.case_id||!v1957BlockerForm.title.trim())return;
    try{const payload={...v1957BlockerForm,due_at:v1957BlockerForm.due_at?new Date(v1957BlockerForm.due_at).toISOString():null};const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${v1957Blockers.case_id}/blockers`,{method:'POST',body:JSON.stringify(payload)});setNotice(d.message);await openV1957Blockers({id:v1957Blockers.case_id});}
    catch(error){setNotice(`Blockers: ${error.message}`);}
  }
  async function resolveV1957Blocker(x){
    const note=window.prompt('Resolution note:','')||'';
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-blockers/${x.id}/resolve`,{method:'POST',body:JSON.stringify({note})});setNotice(d.message);await openV1957Blockers({id:x.case_id});}
    catch(error){setNotice(`Blockers: ${error.message}`);}
  }

  async function loadV1953Acceptance(){
    try{const d=await api('/api/admin/learn-earn/teacher-resolution-acceptance-analytics');setV1953Acceptance(d||{summary:{},categories:[]});}
    catch(error){setNotice(`Acceptance Analytics: ${error.message}`);}
  }
  async function actV1953Risk(x,action){
    const note=window.prompt('Risk action note:','')||'';
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/risk-action`,{method:'POST',body:JSON.stringify({action,note})});setNotice(d.message);await loadV1949Governance();}
    catch(error){setNotice(`Risk Action: ${error.message}`);}
  }
  async function recommendV1953Knowledge(x){
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/knowledge-recommendations`);setV1953Recommendations({case_id:x.id,items:d.recommendations||[]});}
    catch(error){setNotice(`Recommendations: ${error.message}`);}
  }
  async function decideV1953Handoff(h,decision){
    const note=window.prompt('Optional handoff note:','')||'';
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-handoffs/${h.id}/acceptance`,{method:'POST',body:JSON.stringify({decision,note})});setNotice(d.message);await openV1949Handoff({id:h.case_id});await loadTeacherStatementCases();}
    catch(error){setNotice(`Handoff: ${error.message}`);}
  }

  async function loadV1949Governance(){
    try{
      const [r,k]=await Promise.all([api('/api/admin/learn-earn/teacher-statement-risk-queue'),api('/api/admin/learn-earn/teacher-statement-resolution-knowledge')]);
      setV1949Risk(r||{summary:{},cases:[]});setV1949Knowledge(k.knowledge||[]);
    }catch(error){setNotice(`V19.49 Governance: ${error.message}`);}
  }
  async function saveV1949Knowledge(){
    if(!v1949KnowledgeForm.title.trim()||!v1949KnowledgeForm.resolution_pattern.trim())return;
    try{const d=await api('/api/admin/learn-earn/teacher-statement-resolution-knowledge',{method:'POST',body:JSON.stringify(v1949KnowledgeForm)});setNotice(d.message);setV1949KnowledgeForm({title:'',category:'GENERAL',root_cause:'',resolution_pattern:''});await loadV1949Governance();}
    catch(error){setNotice(`Knowledge: ${error.message}`);}
  }
  async function applyV1949Knowledge(k,x){
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-resolution-knowledge/${k.id}/use`,{method:'POST',body:JSON.stringify({case_id:x.id})});setNotice(d.message);await loadTeacherStatementCases();}
    catch(error){setNotice(`Knowledge: ${error.message}`);}
  }
  async function openV1949Handoff(x){
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/handoff`);setV1949Handoff({case_id:x.id,to_owner:'',reason:'',history:d.handoffs||[]});}
    catch(error){setNotice(`Handoff: ${error.message}`);}
  }
  async function submitV1949Handoff(){
    if(!v1949Handoff.case_id||!v1949Handoff.to_owner.trim()||!v1949Handoff.reason.trim())return;
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${v1949Handoff.case_id}/handoff`,{method:'POST',body:JSON.stringify({to_owner:v1949Handoff.to_owner,reason:v1949Handoff.reason})});setNotice(d.message);await openV1949Handoff({id:v1949Handoff.case_id});await loadTeacherStatementCases();}
    catch(error){setNotice(`Handoff: ${error.message}`);}
  }

  async function loadV1945Governance(){
    try{
      const [q,r]=await Promise.all([
        api('/api/admin/learn-earn/teacher-statement-followup-queue'),
        api('/api/admin/learn-earn/teacher-statement-reopen-requests')
      ]);
      setV1945FollowupQueue(q||{summary:{},followups:[]});
      setV1945ReopenRequests(r.requests||[]);
    }catch(error){setNotice(`Case Governance: ${error.message}`);}
  }
  async function reviewV1945Reopen(x,decision){
    const note=window.prompt('Optional review note:','')||'';
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-reopen-requests/${x.id}/review`,{method:'POST',body:JSON.stringify({decision,note})});setNotice(d.message);await loadV1945Governance();await loadTeacherStatementCases();}
    catch(error){setNotice(`Reopen Review: ${error.message}`);}
  }
  async function openV1945Watchers(x){
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/watchers`);setV1945Watchers({case_id:x.id,items:d.watchers||[]});setV1945WatcherForm({watcher_reference:'',watcher_role:''});}
    catch(error){setNotice(`Collaborators: ${error.message}`);}
  }
  async function addV1945Watcher(){
    if(!v1945Watchers.case_id||!v1945WatcherForm.watcher_reference.trim())return;
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${v1945Watchers.case_id}/watchers`,{method:'POST',body:JSON.stringify(v1945WatcherForm)});setNotice(d.message);await openV1945Watchers({id:v1945Watchers.case_id});}
    catch(error){setNotice(`Collaborators: ${error.message}`);}
  }
  async function removeV1945Watcher(x){
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-watchers/${x.id}/remove`,{method:'POST',body:'{}'});setNotice(d.message);await openV1945Watchers({id:x.case_id});}
    catch(error){setNotice(`Collaborators: ${error.message}`);}
  }
  async function openV1945Approval(x){
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/closure-approval`);setV1945Approval({case_id:x.id,...d.requirement});}
    catch(error){setNotice(`Closure Approval: ${error.message}`);}
  }
  async function decideV1945Approval(decision){
    if(!v1945Approval?.case_id)return;
    const note=window.prompt('Approval note:','')||'';
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${v1945Approval.case_id}/closure-approval`,{method:'POST',body:JSON.stringify({decision,note})});setNotice(d.message);await openV1945Approval({id:v1945Approval.case_id});await loadTeacherStatementCases();}
    catch(error){setNotice(`Closure Approval: ${error.message}`);}
  }

  async function resolveDuplicateCase(x,resolution){
    const note=window.prompt('Optional duplicate review note:','')||'';
    try{
      const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/duplicate-resolution`,{method:'POST',body:JSON.stringify({resolution,note})});
      setNotice(d.message);await loadV1937Duplicates();await loadTeacherStatementCases();
    }catch(error){setNotice(`Duplicate Review: ${error.message}`);}
  }
  async function openV1941Followups(x){
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/followups`);setV1941Followups({case_id:x.id,items:d.followups||[]});setV1941FollowupForm({due_at:'',note:''});}
    catch(error){setNotice(`Follow-ups: ${error.message}`);}
  }
  async function addV1941Followup(){
    if(!v1941Followups.case_id||!v1941FollowupForm.due_at||!v1941FollowupForm.note.trim())return;
    try{
      const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${v1941Followups.case_id}/followups`,{method:'POST',body:JSON.stringify({due_at:new Date(v1941FollowupForm.due_at).toISOString(),note:v1941FollowupForm.note})});
      setNotice(d.message);await openV1941Followups({id:v1941Followups.case_id});
    }catch(error){setNotice(`Follow-ups: ${error.message}`);}
  }
  async function updateV1941Followup(x,action){
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-followups/${x.id}/${action}`,{method:'POST',body:'{}'});setNotice(d.message);await openV1941Followups({id:x.case_id});}
    catch(error){setNotice(`Follow-ups: ${error.message}`);}
  }
  async function openV1941Impact(x){
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/finance-impact-preview`);setV1941Impact(d.preview||null);}
    catch(error){setNotice(`Finance Impact: ${error.message}`);}
  }
  async function exportV1941Summary(x){
    try{
      const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/summary-export`);
      const blob=new Blob([JSON.stringify(d.summary,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),el=document.createElement('a');
      el.href=u;el.download=`HOWDI_${x.case_number||x.id}_Summary.json`;document.body.appendChild(el);el.click();el.remove();URL.revokeObjectURL(u);
      setNotice('Case summary exported.');
    }catch(error){setNotice(`Case Summary: ${error.message}`);}
  }

  async function loadV1937Duplicates(){try{const d=await api('/api/admin/learn-earn/teacher-statement-duplicates');setV1937Duplicates(d.duplicates||[]);}catch(error){setNotice(`Duplicates: ${error.message}`);}}
  async function openV1937Evidence(x){try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/evidence`);setV1937Evidence({case_id:x.id,items:d.evidence||[]});}catch(error){setNotice(`Evidence: ${error.message}`);}}
  async function addV1937Evidence(){if(!v1937Evidence.case_id||!v1937EvidenceForm.title.trim())return;try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${v1937Evidence.case_id}/evidence`,{method:'POST',body:JSON.stringify(v1937EvidenceForm)});setNotice(d.message);const r=await api(`/api/admin/learn-earn/teacher-statement-cases/${v1937Evidence.case_id}/evidence`);setV1937Evidence(v=>({...v,items:r.evidence||[]}));setV1937EvidenceForm({title:'',reference_code:'',reference_url:'',note:''});}catch(error){setNotice(`Evidence: ${error.message}`);}}
  async function openV1937Closure(x){try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/closure-checklist`);setV1937Closure({case_id:x.id,...d.closure});}catch(error){setNotice(`Closure: ${error.message}`);}}
  async function verifyV1937Closure(){if(!v1937Closure?.case_id)return;try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${v1937Closure.case_id}/closure-checklist`,{method:'POST',body:'{}'});setNotice(d.message);setV1937Closure({case_id:v1937Closure.case_id,...d.closure});await loadTeacherStatementCases();}catch(error){setNotice(`Closure: ${error.message}`);}}
  async function exportV1937Audit(x){try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/audit-pack`);const blob=new Blob([JSON.stringify(d.audit_pack,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),el=document.createElement('a');el.href=u;el.download=`HOWDI_${x.case_number||x.id}_Audit.json`;document.body.appendChild(el);el.click();el.remove();URL.revokeObjectURL(u);setNotice('Audit pack exported.');}catch(error){setNotice(`Audit: ${error.message}`);}}

  async function loadV1933Ops(){
    try{
      const [t,q]=await Promise.all([
        api('/api/admin/learn-earn/teacher-statement-templates'),
        api('/api/admin/learn-earn/teacher-statement-case-quality')
      ]);
      setV1933Templates(t.templates||[]);setV1933Quality(q||{quality:{},taxonomy:[]});
    }catch(error){setNotice(`Dispute Ops: ${error.message}`);}
  }
  function openV1933Taxonomy(x){setV1933Taxonomy({id:x.id,category:x.category||'GENERAL',root_cause:x.root_cause||'',impact_level:x.impact_level||'NORMAL',tags:Array.isArray(x.tags)?x.tags.join(', '):''});}
  async function saveV1933Taxonomy(){
    const x=v1933Taxonomy;if(!x.id)return;
    try{
      const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${x.id}/taxonomy`,{method:'POST',body:JSON.stringify({category:x.category,root_cause:x.root_cause,impact_level:x.impact_level,tags:x.tags.split(',').map(v=>v.trim()).filter(Boolean)})});
      setNotice(d.message);setV1933Taxonomy({id:null,category:'GENERAL',root_cause:'',impact_level:'NORMAL',tags:''});await loadTeacherStatementCases();await loadV1933Ops();
    }catch(error){setNotice(`Classification: ${error.message}`);}
  }
  function useV1933Template(x){setTeacherCaseReply(x.body||'');setTeacherCaseReplyInternal(false);setNotice(`Template "${x.title}" loaded.`);}

  async function loadTeacherCaseAnalytics(){
    setTeacherCaseAnalyticsBusy(true);
    try{
      const d=await api('/api/admin/learn-earn/teacher-statement-case-analytics');
      setTeacherCaseAnalytics(d.analytics||{summary:{},aging:{},owner_load:[],priority:[],trend:[]});
    }catch(error){setNotice(`Dispute Analytics: ${error.message}`);}
    finally{setTeacherCaseAnalyticsBusy(false);}
  }

  async function openTeacherCaseConversation(item){
    setTeacherCaseConversationBusy(true);
    try{
      const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${item.id}/messages`);
      setTeacherCaseConversation({case_id:item.id,messages:d.messages||[]});
      setTeacherCaseReply("");setTeacherCaseReplyInternal(false);
    }catch(error){setNotice(`Dispute Conversation: ${error.message}`);}
    finally{setTeacherCaseConversationBusy(false);}
  }

  async function sendTeacherCaseReply(){
    if(!teacherCaseConversation.case_id||!teacherCaseReply.trim())return;
    setTeacherCaseConversationBusy(true);
    try{
      const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${teacherCaseConversation.case_id}/messages`,{
        method:'POST',
        body:JSON.stringify({message:teacherCaseReply.trim(),is_internal:teacherCaseReplyInternal})
      });
      setNotice(d.message||'Message saved.');
      setTeacherCaseReply("");
      const refreshed=await api(`/api/admin/learn-earn/teacher-statement-cases/${teacherCaseConversation.case_id}/messages`);
      setTeacherCaseConversation(v=>({...v,messages:refreshed.messages||[]}));
      await loadTeacherStatementCases();
    }catch(error){setNotice(`Dispute Conversation: ${error.message}`);}
    finally{setTeacherCaseConversationBusy(false);}
  }

  async function runTeacherStatementSla(){
    setTeacherStatementCaseBusy(true);
    try{
      const d=await api('/api/admin/learn-earn/teacher-statement-cases/run-sla',{method:'POST',body:JSON.stringify({})});
      setNotice(d.message||'Teacher dispute SLA check completed.');
      await loadTeacherStatementCases();
    }catch(error){setNotice(`Dispute SLA: ${error.message}`);}
    finally{setTeacherStatementCaseBusy(false);}
  }

  async function loadTeacherStatementCases(){
    setTeacherStatementCaseBusy(true);
    try{const d=await api('/api/admin/learn-earn/teacher-statement-cases');setTeacherStatementCases({summary:d.summary||{},cases:d.cases||[]});}
    catch(error){setNotice(`Statement Cases: ${error.message}`);}finally{setTeacherStatementCaseBusy(false);}
  }
  function editTeacherCaseTriage(item){
    setTeacherCaseTriageDraft({
      id:item.id,
      assigned_to:item.assigned_to||'',
      priority:item.priority||'NORMAL',
      due_at:item.due_at?new Date(item.due_at).toISOString().slice(0,16):''
    });
  }
  async function saveTeacherCaseTriage(){
    const d=teacherCaseTriageDraft;
    if(!d.id)return;
    setTeacherStatementCaseBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/teacher-statement-cases/${d.id}/triage`,{
        method:'POST',
        body:JSON.stringify({
          assigned_to:d.assigned_to,
          priority:d.priority,
          due_at:d.due_at?new Date(d.due_at).toISOString():null
        })
      });
      setNotice(data.message||'Dispute triage updated.');
      setTeacherCaseTriageDraft({id:null,assigned_to:'',priority:'NORMAL',due_at:''});
      await loadTeacherStatementCases();
    }catch(error){setNotice(`Statement Cases: ${error.message}`);}
    finally{setTeacherStatementCaseBusy(false);}
  }

  async function updateTeacherStatementCase(item,status){
    let resolution='',admin_note='';
    if(status==='RESOLVED'){
      resolution=window.prompt('Enter finance resolution for the teacher:','')||'';
      if(!resolution.trim())return;
    }else admin_note=window.prompt('Optional admin note:','')||'';
    setTeacherStatementCaseBusy(true);
    try{const d=await api(`/api/admin/learn-earn/teacher-statement-cases/${item.id}/status`,{method:'POST',body:JSON.stringify({status,resolution,admin_note})});setNotice(d.message);await loadTeacherStatementCases();}
    catch(error){setNotice(`Statement Cases: ${error.message}`);}finally{setTeacherStatementCaseBusy(false);}
  }

  async function loadTeacherStatements(month=teacherStatementMonth){
    setTeacherStatementsBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/teacher-statements?month=${encodeURIComponent(month)}`);
      setTeacherStatements({summary:data.summary||{},teachers:data.teachers||[]});
    }catch(error){
      setNotice(`Teacher Statements: ${error.message}`);
    }finally{
      setTeacherStatementsBusy(false);
    }
  }

  async function loadTeacherPayoutReconciliation(){
    setTeacherPayoutReconBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/teacher-payout-reconciliation');
      setTeacherPayoutRecon({latest:data.latest||null,issues:data.issues||[],history:data.history||[]});
    }catch(error){
      setNotice(`Teacher Payout Reconciliation: ${error.message}`);
    }finally{
      setTeacherPayoutReconBusy(false);
    }
  }

  async function runTeacherPayoutReconciliation(){
    setTeacherPayoutReconBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/teacher-payout-reconciliation/run',{method:'POST',body:JSON.stringify({})});
      setNotice(data.message||'Teacher payout reconciliation completed.');
      await loadTeacherPayoutReconciliation();
      await loadTeacherPayoutControl();
    }catch(error){
      setNotice(`Teacher Payout Reconciliation: ${error.message}`);
    }finally{
      setTeacherPayoutReconBusy(false);
    }
  }

  async function loadTeacherPayoutControl(){
    setTeacherPayoutBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/teacher-payouts');
      setTeacherPayoutControl({
        summary:data.summary||{},
        eligible_settlements:data.eligible_settlements||[],
        batches:data.batches||[]
      });
      setTeacherPayoutSelected(prev=>prev.filter(id=>(data.eligible_settlements||[]).some(x=>Number(x.id)===Number(id))));
    }catch(error){
      setNotice(`Teacher Payouts: ${error.message}`);
    }finally{
      setTeacherPayoutBusy(false);
    }
  }

  function toggleTeacherPayoutSettlement(id){
    setTeacherPayoutSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  }

  async function createTeacherPayoutBatch(){
    if(!teacherPayoutSelected.length){setNotice('Select at least one teacher settlement.');return;}
    setTeacherPayoutBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/teacher-payouts/batches',{
        method:'POST',
        body:JSON.stringify({settlement_ids:teacherPayoutSelected,note:teacherPayoutNote})
      });
      setNotice(data.message||'Teacher payout batch created.');
      setTeacherPayoutSelected([]);
      setTeacherPayoutNote("");
      await loadTeacherPayoutControl();
      await loadTeacherSettlementControl();
    }catch(error){
      setNotice(`Teacher Payouts: ${error.message}`);
    }finally{
      setTeacherPayoutBusy(false);
    }
  }

  async function actOnTeacherPayoutBatch(batch,action){
    if(action==='mark-paid'&&!teacherPayoutReference.trim()){
      setNotice('Enter the UTR / external payment reference before marking a payout batch paid.');
      return;
    }
    setTeacherPayoutBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/teacher-payouts/batches/${batch.id}/${action}`,{
        method:'POST',
        body:JSON.stringify({
          reference:action==='mark-paid'?teacherPayoutReference:"",
          note:teacherPayoutNote
        })
      });
      setNotice(data.message||'Teacher payout batch updated.');
      if(action==='mark-paid')setTeacherPayoutReference("");
      await loadTeacherPayoutControl();
      await loadTeacherSettlementControl();
      await loadLearnHpayEconomy();
    }catch(error){
      setNotice(`Teacher Payouts: ${error.message}`);
    }finally{
      setTeacherPayoutBusy(false);
    }
  }

  async function loadTeacherSettlementControl(){
    setTeacherSettlementBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/teacher-settlements');
      setTeacherSettlementControl({
        summary:data.summary||{},
        ready:data.ready||[],
        blocked:data.blocked||[],
        settlements:data.settlements||[]
      });
    }catch(error){
      setNotice(`Teacher Settlements: ${error.message}`);
    }finally{
      setTeacherSettlementBusy(false);
    }
  }

  async function createTeacherSettlement(item){
    if(!item?.hpay_account_id)return;
    setTeacherSettlementBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/teacher-settlements/create',{
        method:'POST',
        body:JSON.stringify({
          hpay_account_id:Number(item.hpay_account_id),
          admin_note:teacherSettlementNote
        })
      });
      setNotice(data.message||'Teacher settlement created.');
      setTeacherSettlementNote("");
      await loadTeacherSettlementControl();
      await loadLearnHpayEconomy();
    }catch(error){
      setNotice(`Teacher Settlements: ${error.message}`);
    }finally{
      setTeacherSettlementBusy(false);
    }
  }

  async function loadTeacherDeliveryValidation(){
    setTeacherDeliveryBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/teacher-delivery-validation');
      setTeacherDeliveryControl({summary:data.summary||{},direct:data.direct||[],groups:data.groups||[],recent:data.recent||[]});
    }catch(error){setNotice(`Teacher Delivery: ${error.message}`);}
    finally{setTeacherDeliveryBusy(false);}
  }
  function openTeacherDeliveryReview(item){
    setTeacherDeliverySelected(item);
    setTeacherDeliveryForm({decision:"VALIDATED",amount:"",reason:""});
  }
  async function saveTeacherDeliveryReview(){
    if(!teacherDeliverySelected)return;
    if(teacherDeliveryForm.decision==="VALIDATED"&&Number(teacherDeliveryForm.amount||0)<=0){setNotice("Enter a positive earning amount for validated delivery.");return;}
    setTeacherDeliveryBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/teacher-delivery-validation/review',{method:'POST',
        body:JSON.stringify({delivery_type:teacherDeliverySelected.delivery_type,source_id:teacherDeliverySelected.source_id,
          decision:teacherDeliveryForm.decision,amount:Number(teacherDeliveryForm.amount||0),reason:teacherDeliveryForm.reason})});
      setNotice(data.message||'Teacher delivery reviewed.');
      setTeacherDeliverySelected(null);await loadTeacherDeliveryValidation();await loadLearnHpayEconomy();
    }catch(error){setNotice(`Teacher Delivery: ${error.message}`);}
    finally{setTeacherDeliveryBusy(false);}
  }

  async function loadLearnAdminSecurity(){
    setLearnAdminSecurityBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/security-status');
      setLearnAdminSecurity({current_session:data.current_session||null,active_sessions:data.active_sessions||[],recent_audit:data.recent_audit||[],policy:data.policy||{}});
    }catch(error){if(error.status!==401)setNotice(`Admin Security: ${error.message}`);}
    finally{setLearnAdminSecurityBusy(false);}
  }
  async function revokeOtherLearnAdminSessions(){
    if(!window.confirm('Revoke all other active admin sessions? The current browser will remain signed in.'))return;
    setLearnAdminSecurityBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/security/revoke-other-sessions',{method:'POST',body:'{}'});
      setNotice(data.message||'Other admin sessions revoked.');await loadLearnAdminSecurity();loadTeacherDeliveryValidation();loadTeacherSettlementControl();loadTeacherPayoutControl();loadTeacherPayoutReconciliation();loadTeacherStatements();loadTeacherStatementCases();
    }catch(error){setNotice(`Admin Security: ${error.message}`);}
    finally{setLearnAdminSecurityBusy(false);}
  }

  async function loadLearnAccessHealth(){
    setLearnAccessHealthBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/access-health');
      setLearnAccessHealth({summary:data.summary||{},mismatches:data.mismatches||[]});
    }catch(error){setNotice(`Access Health: ${error.message}`);}
    finally{setLearnAccessHealthBusy(false);}
  }
  async function runLearnAccessReconciliation(){
    setLearnAccessHealthBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/access-reconcile',{method:'POST',body:'{}'});
      setLearnAccessReconcileResult(data.result||{});
      setNotice(data.message||'Learning access reconciled.');
      await loadLearnAccessHealth();loadLearnAdminSecurity();await loadLearnAccessControl();
    }catch(error){setNotice(`Access Reconciliation: ${error.message}`);}
    finally{setLearnAccessHealthBusy(false);}
  }

  async function loadLearnHpayEconomy(){
    setLearnHpayBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/hpay-economy');
      setLearnHpayEconomy({
        learner_rewards:data.learner_rewards||{totals:{},rules:[],courses:[],participants:[]},
        teacher_summary:data.teacher_summary||{},
        teachers:data.teachers||[]
      });
    }catch(error){setNotice(`HPay Learn & Earn: ${error.message}`);}
    finally{setLearnHpayBusy(false);}
  }
  async function createLearnHpayRewardRule(){
    if(!learnHpayRule.course_id){setNotice('Choose a course for the reward rule.');return;}
    if(learnHpayRule.reward_status==='ENABLED'&&Number(learnHpayRule.reward_amount||0)<=0){setNotice('Enabled cash reward must be greater than zero.');return;}
    setLearnHpayBusy(true);
    try{
      const data=await api('/api/admin/hpay/learn-earn/reward-rules',{
        method:'POST',
        body:JSON.stringify({
          course_id:learnHpayRule.course_id,reward_amount:Number(learnHpayRule.reward_amount||0),reward_status:learnHpayRule.reward_status,
          effective_from:learnHpayRule.effective_from||null,effective_until:learnHpayRule.effective_until||null,admin_note:learnHpayRule.admin_note
        })
      });
      setNotice(data.message||'Reward rule created.');
      setLearnHpayRule({course_id:"",reward_amount:"",reward_status:"DISABLED",effective_from:"",effective_until:"",admin_note:""});
      await loadLearnHpayEconomy();loadLearnAccessHealth();
    }catch(error){setNotice(`HPay Learn & Earn: ${error.message}`);}
    finally{setLearnHpayBusy(false);}
  }
  async function syncLearnHpayRewards(){
    setLearnHpayBusy(true);
    try{
      const data=await api('/api/admin/hpay/learn-earn/sync',{method:'POST',body:'{}'});
      setNotice(data.message||'Learn & Earn HPay synced.');await loadLearnHpayEconomy();
    }catch(error){setNotice(`HPay Learn & Earn: ${error.message}`);}
    finally{setLearnHpayBusy(false);}
  }

  async function loadLearnAiVisionControl(){
    setLearnAiVisionBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/ai-vision');
      setLearnAiVisionControl({summary:data.summary||{},reviews:data.reviews||[],provider:data.provider||{}});
    }catch(error){setNotice(`AI Vision: ${error.message}`);}
    finally{setLearnAiVisionBusy(false);}
  }

  async function loadLearnPartnerControl(){
    setLearnPartnerBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/partners');
      setLearnPartnerControl({partners:data.partners||[],programs:data.programs||[],members:data.members||[]});
    }catch(error){setNotice(`Partner Bridge: ${error.message}`);}
    finally{setLearnPartnerBusy(false);}
  }

  async function createLearnPartner(){
    if(!learnPartnerForm.name.trim()){setNotice('Add a partner name.');return;}
    setLearnPartnerBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/partners',{method:'POST',body:JSON.stringify({...learnPartnerForm,created_by:'HOWDI Admin'})});
      setNotice(data.message||'Partner created.');
      setLearnPartnerForm({name:"",partner_type:"SHG",description:"",contact_name:"",contact_email:"",contact_phone:"",city:"",state:"",country:"India"});
      await loadLearnPartnerControl();loadLearnAiVisionControl();loadLearnHpayEconomy();
    }catch(error){setNotice(`Partner Bridge: ${error.message}`);}
    finally{setLearnPartnerBusy(false);}
  }

  async function governLearnPartner(partner,status,verification_status){
    setLearnPartnerBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/partners/${partner.id}/govern`,{method:'POST',body:JSON.stringify({status:status||"",verification_status:verification_status||""})});
      setNotice(data.message||'Partner governance updated.');await loadLearnPartnerControl();
    }catch(error){setNotice(`Partner Bridge: ${error.message}`);}
    finally{setLearnPartnerBusy(false);}
  }

  async function createLearnPartnerProgram(){
    if(!learnPartnerProgramForm.partner_id||!learnPartnerProgramForm.title.trim()){setNotice('Choose a partner and add program title.');return;}
    setLearnPartnerBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/partner-programs',{method:'POST',body:JSON.stringify({...learnPartnerProgramForm,seats:learnPartnerProgramForm.seats?Number(learnPartnerProgramForm.seats):null,starts_at:learnPartnerProgramForm.starts_at||null,ends_at:learnPartnerProgramForm.ends_at||null,created_by:'HOWDI Admin'})});
      setNotice(data.message||'Partner program created.');
      setLearnPartnerProgramForm({partner_id:"",title:"",description:"",program_type:"SKILL_COHORT",target_group:"",seats:"",starts_at:"",ends_at:"",visibility:"PRIVATE",course_ids:[],opportunity_ids:[]});
      await loadLearnPartnerControl();
    }catch(error){setNotice(`Partner Program: ${error.message}`);}
    finally{setLearnPartnerBusy(false);}
  }

  async function updateLearnPartnerProgramStatus(program,status){
    setLearnPartnerBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/partner-programs/${program.id}/status`,{method:'POST',body:JSON.stringify({status})});
      setNotice(data.message||'Program status updated.');await loadLearnPartnerControl();
    }catch(error){setNotice(`Partner Program: ${error.message}`);}
    finally{setLearnPartnerBusy(false);}
  }

  async function updateLearnPartnerMemberStatus(member,status){
    setLearnPartnerBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/partner-program-members/${member.id}/status`,{method:'POST',body:JSON.stringify({status,actor:'HOWDI Admin'})});
      setNotice(data.message||'Program member updated.');await loadLearnPartnerControl();
    }catch(error){setNotice(`Partner Member: ${error.message}`);}
    finally{setLearnPartnerBusy(false);}
  }

  async function loadLearnOpportunityPipeline(){
    setLearnOpportunityPipelineBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/opportunity-pipeline');
      setLearnOpportunityPipeline({summary:data.summary||{},pipeline:Array.isArray(data.pipeline)?data.pipeline:[]});
    }catch(error){setNotice(`Opportunity Pipeline: ${error.message}`);}
    finally{setLearnOpportunityPipelineBusy(false);}
  }

  function openLearnOpportunityPipeline(item){
    setLearnOpportunityPipelineSelected(item);
    setLearnOpportunityPipelineForm({
      status:item.status||"INTERESTED",
      stage_note:item.stage_note||"",
      next_action:item.next_action||"",
      next_action_at:item.next_action_at?String(item.next_action_at).slice(0,16):"",
      outcome_type:item.outcome_type||"",
      outcome_note:item.outcome_note||""
    });
  }

  async function saveLearnOpportunityPipeline(){
    const item=learnOpportunityPipelineSelected;if(!item)return;
    if(learnOpportunityPipelineForm.status==="COMPLETED"&&!learnOpportunityPipelineForm.outcome_type){setNotice("Choose an outcome type before marking Completed.");return;}
    setLearnOpportunityPipelineBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/opportunity-pipeline/${item.id}/stage`,{
        method:'POST',
        body:JSON.stringify({...learnOpportunityPipelineForm,actor:'HOWDI Admin',next_action_at:learnOpportunityPipelineForm.next_action_at||null})
      });
      setNotice(data.message||'Opportunity pipeline updated.');
      setLearnOpportunityPipelineSelected(null);await loadLearnOpportunityPipeline();loadLearnPartnerControl();await loadLearnMarketIntelligence();
    }catch(error){setNotice(`Opportunity Pipeline: ${error.message}`);}
    finally{setLearnOpportunityPipelineBusy(false);}
  }

  async function loadLearnMarketIntelligence(){
    setLearnMarketBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/market-intelligence');
      setLearnMarketIntel({
        summary:data.summary||{},
        skill_signals:Array.isArray(data.skill_signals)?data.skill_signals:[],
        opportunity_interest_signals:Array.isArray(data.opportunity_interest_signals)?data.opportunity_interest_signals:[],
        course_signals:Array.isArray(data.course_signals)?data.course_signals:[]
      });
    }catch(error){setNotice(`Market Intelligence: ${error.message}`);}
    finally{setLearnMarketBusy(false);}
  }

  async function loadLearnAccessControl(){
    setLearnAccessBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/access-plans');
      setLearnAccessControl({plans:Array.isArray(data.plans)?data.plans:[],subscriptions:Array.isArray(data.subscriptions)?data.subscriptions:[]});
    }catch(error){setNotice(`Learning Access: ${error.message}`);}
    finally{setLearnAccessBusy(false);}
  }

  async function createLearnAccessPlan(){
    if(!learnAccessForm.name.trim()){setNotice('Add a learning plan name.');return;}
    setLearnAccessBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/access-plans',{
        method:'POST',
        body:JSON.stringify({
          ...learnAccessForm,
          price:Number(learnAccessForm.price||0),
          access_days:learnAccessForm.access_days?Number(learnAccessForm.access_days):null,
          sort_order:Number(learnAccessForm.sort_order||0),
          benefits:learnAccessForm.benefits.split('\n').map(x=>x.trim()).filter(Boolean),
          course_ids:learnAccessCourseIds,
          created_by:'HOWDI Admin'
        })
      });
      setNotice(data.message||'Learning access plan created.');
      setLearnAccessForm({name:"",description:"",price:"0",currency:"INR",billing_cycle:"MONTHLY",access_days:"",sort_order:"0",benefits:""});
      setLearnAccessCourseIds([]); await loadLearnAccessControl();
    }catch(error){setNotice(`Learning Access: ${error.message}`);}
    finally{setLearnAccessBusy(false);}
  }

  async function updateLearnAccessPlanStatus(plan,status){
    setLearnAccessBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/access-plans/${plan.id}/status`,{method:'POST',body:JSON.stringify({status})});
      setNotice(data.message||'Plan status updated.'); await loadLearnAccessControl();
    }catch(error){setNotice(`Learning Access: ${error.message}`);}
    finally{setLearnAccessBusy(false);}
  }

  async function saveLearnAccessPlanCourses(plan){
    setLearnAccessBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/access-plans/${plan.id}/courses`,{method:'POST',body:JSON.stringify({course_ids:learnAccessCourseIds})});
      setNotice(data.message||'Plan courses updated.'); setLearnAccessSelectedPlan(null); await loadLearnAccessControl();
    }catch(error){setNotice(`Learning Access: ${error.message}`);}
    finally{setLearnAccessBusy(false);}
  }

  async function activateLearnAccessSubscription(sub){
    setLearnAccessBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/access-subscriptions/${sub.id}/activate`,{
        method:'POST',
        body:JSON.stringify({actor:'HOWDI Admin',activation_source:learnAccessActivation.source,payment_reference:learnAccessActivation.payment_reference})
      });
      setNotice(data.message||'Learning access activated.'); setLearnAccessActivation({source:"ADMIN_GRANT",payment_reference:""}); await loadLearnAccessControl();
    }catch(error){setNotice(`Learning Access: ${error.message}`);}
    finally{setLearnAccessBusy(false);}
  }

  async function cancelLearnAccessSubscription(sub){
    if(!window.confirm('Cancel this learning access subscription? Subscription-only course entitlements will be revoked, but purchased access will remain.'))return;
    setLearnAccessBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/access-subscriptions/${sub.id}/cancel`,{method:'POST',body:JSON.stringify({actor:'HOWDI Admin',note:'Cancelled from Learn & Earn access control'})});
      setNotice(data.message||'Learning access cancelled.'); await loadLearnAccessControl();
    }catch(error){setNotice(`Learning Access: ${error.message}`);}
    finally{setLearnAccessBusy(false);}
  }

  async function loadLearnOpportunityControl(){
    setLearnOpportunityBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/opportunities');
      setLearnOpportunityControl({summary:data.summary||{},opportunities:Array.isArray(data.opportunities)?data.opportunities:[]});
    }catch(error){setNotice(`Opportunity Bridge: ${error.message}`);}
    finally{setLearnOpportunityBusy(false);}
  }

  async function createLearnOpportunity(){
    if(!learnOpportunityForm.title.trim()){setNotice('Add an opportunity title first.');return;}
    setLearnOpportunityBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/opportunities',{
        method:'POST',
        body:JSON.stringify({
          ...learnOpportunityForm,
          required_skill_terms:learnOpportunityForm.required_skill_terms.split(',').map(x=>x.trim()).filter(Boolean),
          required_course_id:learnOpportunityForm.required_course_id||null,
          min_verified_evidence:Number(learnOpportunityForm.min_verified_evidence||0),
          min_verified_projects:Number(learnOpportunityForm.min_verified_projects||0),
          min_readiness:Number(learnOpportunityForm.min_readiness||0),
          slots:learnOpportunityForm.slots?Number(learnOpportunityForm.slots):null,
          closes_at:learnOpportunityForm.closes_at||null,
          created_by:'HOWDI Admin'
        })
      });
      setNotice(data.message||'Opportunity saved.');
      setLearnOpportunityForm({title:"",organization_name:"HOWDI Opportunity Partner",opportunity_type:"PROJECT",description:"",location_mode:"FLEXIBLE",location_label:"",required_skill_terms:"",required_course_id:"",min_verified_evidence:"0",min_verified_projects:"0",min_readiness:"0",slots:"",compensation_note:"",application_note:"",closes_at:""});
      await loadLearnOpportunityControl();
    }catch(error){setNotice(`Opportunity Bridge: ${error.message}`);}
    finally{setLearnOpportunityBusy(false);}
  }

  async function updateLearnOpportunityStatus(opportunity,status){
    setLearnOpportunityBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/opportunities/${opportunity.id}/status`,{
        method:'POST',body:JSON.stringify({status,actor:'HOWDI Admin'})
      });
      setNotice(data.message||'Opportunity status updated.');
      await loadLearnOpportunityControl();
      if(learnOpportunitySelected?.id===opportunity.id)setLearnOpportunitySelected({...learnOpportunitySelected,status});
    }catch(error){setNotice(`Opportunity Bridge: ${error.message}`);}
    finally{setLearnOpportunityBusy(false);}
  }

  async function openLearnOpportunityInterests(opportunity){
    setLearnOpportunitySelected(opportunity);setLearnOpportunityInterests([]);setLearnOpportunityBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/opportunities/${opportunity.id}/interests`);
      setLearnOpportunityInterests(Array.isArray(data.interests)?data.interests:[]);
    }catch(error){setNotice(`Opportunity interests: ${error.message}`);}
    finally{setLearnOpportunityBusy(false);}
  }

  async function updateLearnOpportunityInterestStatus(interest,status){
    setLearnOpportunityBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/opportunity-interests/${interest.id}/status`,{
        method:'POST',body:JSON.stringify({status,actor:'HOWDI Admin'})
      });
      setNotice(data.message||'Learner opportunity status updated.');
      if(learnOpportunitySelected)await openLearnOpportunityInterests(learnOpportunitySelected);
      await loadLearnOpportunityControl();
    }catch(error){setNotice(`Opportunity learner status: ${error.message}`);}
    finally{setLearnOpportunityBusy(false);}
  }

  async function loadLearnAiReview(){
    setLearnAiReviewBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/ai-studio');
      setLearnAiReview({
        summary:data.summary||{},
        assets:Array.isArray(data.assets)?data.assets:[],
        policy:data.policy||{}
      });
      if(selectedLearnAiAsset){
        const fresh=(data.assets||[]).find(x=>String(x.id)===String(selectedLearnAiAsset.id));
        if(fresh)setSelectedLearnAiAsset(fresh);
      }
    }catch(error){setNotice(`AI Studio review: ${error.message}`);}
    finally{setLearnAiReviewBusy(false);}
  }

  async function openLearnAiAsset(asset){
    setSelectedLearnAiAsset(asset);
    setLearnAiAssetDetail(null);
    setLearnAiDecision("APPROVED");
    setLearnAiFeedback("");
    setLearnAiReviewBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/ai-studio/assets/${asset.id}`);
      setLearnAiAssetDetail(data);
    }catch(error){setNotice(`AI Studio inspector: ${error.message}`);}
    finally{setLearnAiReviewBusy(false);}
  }

  async function prepareLearnAiCourseBridge(){
    const asset=learnAiAssetDetail?.asset;
    if(!asset?.course_id){setNotice('This approved AI asset is not linked to a course.');return;}
    setLearnAiBridgeBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/courses/${asset.course_id}`);
      setLearnAiBridgeCourse(data);
      setLearnAiBridgeForm({
        module_id:data.modules?.[0]?.id||"",
        title:asset.title||"",
        lesson_type:asset.asset_type==='QUIZ_DRAFT'?'QUIZ':asset.asset_type==='PRACTICE_PROMPT'?'PRACTICE':'TEXT',
        duration_minutes:""
      });
    }catch(error){setNotice(`Course bridge: ${error.message}`);}
    finally{setLearnAiBridgeBusy(false);}
  }

  async function stageLearnAiToCourse(){
    if(!selectedLearnAiAsset||!learnAiBridgeForm.module_id){setNotice('Choose a target module first.');return;}
    setLearnAiBridgeBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/ai-studio/assets/${selectedLearnAiAsset.id}/course-bridge`,{
        method:'POST',
        body:JSON.stringify({
          ...learnAiBridgeForm,
          duration_minutes:Number(learnAiBridgeForm.duration_minutes||0),
          actor:'HOWDI Admin'
        })
      });
      setNotice(data.message||'Approved AI content staged in Course Studio.');
      const refreshed=await api(`/api/admin/learn-earn/ai-studio/assets/${selectedLearnAiAsset.id}`);
      setLearnAiAssetDetail(refreshed);
      setLearnAiBridgeCourse(null);
      await loadLearnEarnCourses();
    }catch(error){setNotice(`Course bridge: ${error.message}`);}
    finally{setLearnAiBridgeBusy(false);}
  }

  async function activateLearnAiLesson(lessonId,courseStatus){
    let confirmLive=false;
    if(courseStatus==='PUBLISHED'){
      confirmLive=window.confirm('This course is already PUBLISHED. Activating this approved lesson will make it available to enrolled learners. Continue?');
      if(!confirmLive)return;
    }
    setLearnAiBridgeBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/lessons/${lessonId}/activate-ai-content`,{
        method:'POST',
        body:JSON.stringify({actor:'HOWDI Admin',confirm_live_change:confirmLive})
      });
      setNotice(data.message||'Approved AI lesson activated.');
      if(selectedLearnAiAsset){
        const refreshed=await api(`/api/admin/learn-earn/ai-studio/assets/${selectedLearnAiAsset.id}`);
        setLearnAiAssetDetail(refreshed);
      }
      if(learnCourseStudio?.course?.id)await openLearnCourseStudio(learnCourseStudio.course.id);
    }catch(error){setNotice(`AI lesson activation: ${error.message}`);}
    finally{setLearnAiBridgeBusy(false);}
  }

  async function discardLearnAiStage(lessonId){
    if(!window.confirm('Discard this inactive staged lesson? No learner-visible content will be changed.'))return;
    setLearnAiBridgeBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/lessons/${lessonId}/discard-ai-stage`,{
        method:'POST',
        body:JSON.stringify({actor:'HOWDI Admin'})
      });
      setNotice(data.message||'Staged AI lesson discarded.');
      if(selectedLearnAiAsset){
        const refreshed=await api(`/api/admin/learn-earn/ai-studio/assets/${selectedLearnAiAsset.id}`);
        setLearnAiAssetDetail(refreshed);
      }
      if(learnCourseStudio?.course?.id)await openLearnCourseStudio(learnCourseStudio.course.id);
    }catch(error){setNotice(`Discard AI stage: ${error.message}`);}
    finally{setLearnAiBridgeBusy(false);}
  }

  async function submitLearnAiReview(){
    if(!selectedLearnAiAsset)return;
    if(!['APPROVED','CHANGES_REQUIRED','REJECTED'].includes(learnAiDecision))return;
    if(['CHANGES_REQUIRED','REJECTED'].includes(learnAiDecision)&&!learnAiFeedback.trim()){
      setNotice('Add reviewer feedback before requesting changes or rejecting content.');
      return;
    }
    setLearnAiReviewBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/ai-studio/assets/${selectedLearnAiAsset.id}/review`,{
        method:'POST',
        body:JSON.stringify({
          decision:learnAiDecision,
          feedback:learnAiFeedback.trim(),
          reviewer:'HOWDI Admin'
        })
      });
      setNotice(data.message||'AI Studio review decision saved.');
      await loadLearnAiReview();
      const refreshed=(await api(`/api/admin/learn-earn/ai-studio/assets/${selectedLearnAiAsset.id}`));
      setLearnAiAssetDetail(refreshed);
      setSelectedLearnAiAsset(x=>x?{...x,status:data.asset?.status||learnAiDecision}:x);
      setLearnAiFeedback("");
    }catch(error){setNotice(`AI Studio review: ${error.message}`);}
    finally{setLearnAiReviewBusy(false);}
  }

  const learnAiStatusLabel=(value)=>String(value||'DRAFT').replaceAll('_',' ');
  const learnAiStatusClass=(value)=>String(value||'DRAFT').toLowerCase().replaceAll('_','-');
  const learnAiTypeLabel=(value)=>({
    LESSON_CLIP:'Lesson Clip',
    EXPLAINER:'Explainer',
    QUIZ_DRAFT:'Quiz Draft',
    PRACTICE_PROMPT:'Practice Prompt',
    SUMMARY:'Summary',
    TRANSLATION_DRAFT:'Translation Draft'
  }[value]||String(value||'Content').replaceAll('_',' '));

  async function loadLearnCommerce(){
    setLearnCommerceBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/commerce');
      setLearnCommerce({summary:data.summary||{},purchases:data.purchases||[]});
      if(selectedLearnPurchase){
        const fresh=(data.purchases||[]).find(x=>String(x.id)===String(selectedLearnPurchase.id));
        if(fresh)setSelectedLearnPurchase(fresh);
      }
    }catch(error){setNotice(`Learning commerce: ${error.message}`);}
    finally{setLearnCommerceBusy(false);}
  }
  async function reconcileLearnEntitlement(item){
    const note=window.prompt(`Reconcile learner access for "${item.course_title}"?\n\nAdd the admin reason / ticket reference:`)||'';
    if(!note.trim())return;
    setLearnCommerceBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/purchases/${item.id}/reconcile-entitlement`,{
        method:'POST',
        body:JSON.stringify({note:note.trim(),actor:'HOWDI Admin'})
      });
      setNotice(data.message||'Learner access reconciled');
      await Promise.all([loadLearnCommerce(),loadLearnEarnCourses()]);
    }catch(error){setNotice(`Entitlement reconciliation: ${error.message}`);}
    finally{setLearnCommerceBusy(false);}
  }
  const learnMoney=(value,currency='INR')=>{
    try{return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:0}).format(Number(value||0));}
    catch{return `₹${Number(value||0).toLocaleString('en-IN')}`;}
  };
  const learnCommerceDate=(value)=>{
    if(!value)return '—';
    const d=new Date(value);
    return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});
  };
  const learnIntegrityLabel=(value)=>({
    OK:'Healthy',
    PAYMENT_PENDING:'Payment pending',
    PAYMENT_FAILED:'Payment failed',
    REFUNDED:'Refunded',
    ENTITLEMENT_MISSING:'Entitlement missing',
    ENROLLMENT_MISSING:'My Learning missing',
    PAYMENT_LEDGER_MISMATCH:'Payment ledger mismatch'
  }[value]||String(value||'Unknown').replaceAll('_',' '));

  async function loadLearnEarnCourses(){
    setLearnCourseBusy(true);
    try{
      const data=await api('/api/admin/learn-earn/courses');
      setLearnCourses(Array.isArray(data.courses)?data.courses:[]);
    }catch(error){setNotice(`Learn & Earn: ${error.message}`);}
    finally{setLearnCourseBusy(false);}
  }

  async function openLearnCourseStudio(courseId){
    setLearnCourseBusy(true);
    try{
      const data=await api(`/api/admin/learn-earn/courses/${courseId}`);
      setLearnCourseStudio({course:data.course,modules:data.modules||[],projects:data.projects||[]});
      setLearnStudioTab("overview");
      setLearnCommercialForm({
        purchase_mode:data.course?.purchase_mode||'FREE',
        price:String(data.course?.price??0),
        sale_price:data.course?.sale_price==null?'':String(data.course.sale_price),
        currency:data.course?.currency||'INR',
        access_days:data.course?.access_days==null?'':String(data.course.access_days),
        refund_policy_text:data.course?.refund_policy_text||'',
        live_class_included:Boolean(data.course?.live_class_included)
      });
      setLearnLessonForm(x=>({...x,module_id:data.modules?.[0]?.id||''}));
    }catch(error){setNotice(`Course Studio: ${error.message}`);}
    finally{setLearnCourseBusy(false);}
  }

  async function createLearnCourse(){
    if(!learnCourseForm.title.trim()){setNotice('Course title is required');return;}
    const createPrice=Math.max(0,Number(learnCourseForm.price||0));
    const createSale=learnCourseForm.sale_price===''?null:Math.max(0,Number(learnCourseForm.sale_price||0));
    if(learnCourseForm.purchase_mode==='PAID' && createPrice<=0){setNotice('Paid courses require a regular price.');return;}
    if(createSale!=null && createSale>createPrice){setNotice('Sale price cannot be greater than regular price.');return;}
    setLearnCourseBusy(true);
    try{
      const payload={
        ...learnCourseForm,
        duration_minutes:Number(learnCourseForm.duration_minutes||0),
        outcomes:learnCourseForm.outcomes.split('\n').map(x=>x.trim()).filter(Boolean),
        materials:learnCourseForm.materials.split('\n').map(x=>x.trim()).filter(Boolean),
        price:createPrice,
        sale_price:createSale,
        access_days:learnCourseForm.access_days===''?null:Math.max(1,Number(learnCourseForm.access_days||1)),
        purchase_mode:learnCourseForm.purchase_mode,
        currency:learnCourseForm.currency||'INR',
        refund_policy_text:learnCourseForm.refund_policy_text,
        live_class_included:Boolean(learnCourseForm.live_class_included)
      };
      const data=await api('/api/admin/learn-earn/courses',{method:'POST',body:JSON.stringify(payload)});
      setNotice(data.message||'Course created');
      setLearnCourseForm({
        title:'',tagline:'Feel like Grandma is teaching you.',description:'',category:'Crochet',
        level:'BEGINNER',language:'English',duration_minutes:'',teaching_style:'GRANDMA_GUIDED',
        outcomes:'',materials:'',
        purchase_mode:'FREE',price:'0',sale_price:'',currency:'INR',access_days:'',
        refund_policy_text:'',live_class_included:false
      });
      await loadLearnEarnCourses();
      if(data.course?.id)await openLearnCourseStudio(data.course.id);
    }catch(error){setNotice(`Create course: ${error.message}`);}
    finally{setLearnCourseBusy(false);}
  }

  async function saveLearnCommercialSettings(){
    if(!learnCourseStudio?.course?.id)return;
    const price=Math.max(0,Number(learnCommercialForm.price||0));
    const sale=learnCommercialForm.sale_price===''?null:Math.max(0,Number(learnCommercialForm.sale_price||0));
    if(learnCommercialForm.purchase_mode==='PAID'&&price<=0){setNotice('Paid courses require a regular price.');return;}
    if(sale!=null&&sale>price){setNotice('Sale price cannot be greater than regular price.');return;}
    setLearnCommercialBusy(true);
    try{
      const course=learnCourseStudio.course;
      const payload={
        title:course.title,
        description:course.description||'',
        category:course.category||'Crochet',
        level:course.level||'BEGINNER',
        duration_minutes:Number(course.duration_minutes||0),
        tagline:course.tagline||'',
        language:course.language||'English',
        teaching_style:course.teaching_style||'GRANDMA_GUIDED',
        thumbnail_url:course.thumbnail_url||'',
        outcomes:Array.isArray(course.outcomes)?course.outcomes:[],
        materials:Array.isArray(course.materials)?course.materials:[],
        project_required:course.project_required!==false,
        certificate_enabled:course.certificate_enabled!==false,
        purchase_mode:learnCommercialForm.purchase_mode,
        price,
        sale_price:sale,
        currency:learnCommercialForm.currency||'INR',
        access_days:learnCommercialForm.access_days===''?null:Math.max(1,Number(learnCommercialForm.access_days||1)),
        refund_policy_text:learnCommercialForm.refund_policy_text,
        live_class_included:Boolean(learnCommercialForm.live_class_included),
        purchase_terms:course.purchase_terms&&typeof course.purchase_terms==='object'?course.purchase_terms:{}
      };
      const data=await api(`/api/admin/learn-earn/courses/${course.id}`,{method:'PUT',body:JSON.stringify(payload)});
      setLearnCourseStudio(x=>({...x,course:data.course}));
      setNotice(data.message||'Commercial settings saved');
      await loadLearnEarnCourses();
    }catch(error){setNotice(`Course pricing: ${error.message}`);}
    finally{setLearnCommercialBusy(false);}
  }

  async function addLearnModule(){
    if(!learnCourseStudio?.course?.id||!learnModuleForm.title.trim())return;
    try{
      await api(`/api/admin/learn-earn/courses/${learnCourseStudio.course.id}/modules`,{
        method:'POST',body:JSON.stringify(learnModuleForm)
      });
      setLearnModuleForm({title:'',description:''});
      await openLearnCourseStudio(learnCourseStudio.course.id);
      await loadLearnEarnCourses();
      setNotice('Module added');
    }catch(error){setNotice(`Module: ${error.message}`);}
  }

  async function addLearnLesson(){
    if(!learnLessonForm.module_id||!learnLessonForm.title.trim()){setNotice('Choose a module and enter lesson title');return;}
    try{
      await api(`/api/admin/learn-earn/modules/${learnLessonForm.module_id}/lessons`,{
        method:'POST',
        body:JSON.stringify({...learnLessonForm,duration_minutes:Number(learnLessonForm.duration_minutes||0)})
      });
      const courseId=learnCourseStudio.course.id;
      setLearnLessonForm({
        module_id:learnLessonForm.module_id,title:'',lesson_type:'VIDEO',content_url:'',content_text:'',
        duration_minutes:'',grandma_tip:'',practice_task:'',is_preview:false
      });
      await openLearnCourseStudio(courseId);
      await loadLearnEarnCourses();
      setNotice('Lesson added');
    }catch(error){setNotice(`Lesson: ${error.message}`);}
  }

  async function addLearnProject(){
    if(!learnCourseStudio?.course?.id||!learnProjectForm.title.trim())return;
    try{
      await api(`/api/admin/learn-earn/courses/${learnCourseStudio.course.id}/projects`,{
        method:'POST',
        body:JSON.stringify({
          ...learnProjectForm,
          minimum_score:Number(learnProjectForm.minimum_score||60),
          evaluation_criteria:learnProjectForm.evaluation_criteria.split('\n').map(x=>x.trim()).filter(Boolean)
        })
      });
      setLearnProjectForm({title:'',description:'',submission_instructions:'',evaluation_criteria:'',minimum_score:'60'});
      await openLearnCourseStudio(learnCourseStudio.course.id);
      setNotice('Final project added');
    }catch(error){setNotice(`Project: ${error.message}`);}
  }

  async function toggleLearnCoursePublish(course,publish){
    try{
      const data=await api(`/api/admin/learn-earn/courses/${course.id}/${publish?'publish':'unpublish'}`,{method:'POST',body:'{}'});
      setNotice(data.message||'Course status updated');
      await loadLearnEarnCourses();
      if(learnCourseStudio?.course?.id===course.id)await openLearnCourseStudio(course.id);
    }catch(error){setNotice(`Publish: ${error.message}`);}
  }

  async function loadPaymentIntegrity(){
    setPaymentIntegrityBusy(true);
    try{
      const data=await api('/api/admin/hpay/payment-integrity');
      setPaymentIntegrity(data.integrity||null);
    }catch(error){
      setNotice(`Finance integrity: ${error.message}`);
    }finally{
      setPaymentIntegrityBusy(false);
    }
  }

  async function syncPaymentIntegrity(){
    setPaymentIntegrityBusy(true);
    try{
      const data=await api('/api/admin/hpay/payment-integrity/sync',{method:'POST',body:'{}'});
      setNotice(`Payment ↔ HPay integrity sync complete. ${data.created||0} new case(s).`);
      await loadPaymentIntegrity();
    }catch(error){
      setNotice(`Integrity sync failed: ${error.message}`);
    }finally{
      setPaymentIntegrityBusy(false);
    }
  }

  async function paymentIntegrityAction(item,action){
    let body={actor:'ADMIN'};
    if(action==='assign'){
      const assigned_to=window.prompt('Assign this finance case to');
      if(!assigned_to)return;
      body.assigned_to=assigned_to;
    }
    if(action==='resolve'){
      const resolution_action=window.prompt('Resolution action (example: Adjustment Journal / Vendor Recovery / No Financial Impact)');
      if(!resolution_action)return;
      const note=window.prompt('Mandatory finance resolution note');
      if(!note)return;
      body.resolution_action=resolution_action;
      body.note=note;
    }
    try{
      await api(`/api/admin/hpay/payment-integrity/${item.id}/${action}`,{
        method:'POST',body:JSON.stringify(body)
      });
      setNotice(`Finance integrity case ${action} completed.`);
      await loadPaymentIntegrity();
    }catch(error){
      setNotice(`Integrity action failed: ${error.message}`);
    }
  }

  async function loadPaymentHpayTrace(payment){
    if(!payment?.orderNumber){setNotice('Payment does not have an order reference');return;}
    setPaymentHpayBusy(true);
    setPaymentHpayTrace(null);
    try{
      const data=await api(`/api/admin/payments/hpay-trace?order_id=${encodeURIComponent(payment.orderNumber)}`);
      setPaymentHpayTrace(data.trace||null);
    }catch(error){
      setNotice(`Payment ↔ HPay trace: ${error.message}`);
    }finally{
      setPaymentHpayBusy(false);
    }
  }

  async function openPaymentTraceParticipant(accountId){
    if(!accountId)return;
    setTab('hpay');
    setHpaySection('participant360');
    await openHpayParticipant360(accountId);
  }

  async function loadHpayParticipants(search=hpayParticipantSearch){
    setHpayParticipantBusy(true);
    try{
      const suffix=search?`?search=${encodeURIComponent(search)}`:'';
      const data=await api(`/api/admin/hpay/participants${suffix}`);
      setHpayParticipants(data.participants||null);
    }catch(error){setNotice(`Participant 360: ${error.message}`);}
    finally{setHpayParticipantBusy(false);}
  }

  async function openHpayParticipant360(id){
    setHpayParticipantBusy(true);
    try{
      const data=await api(`/api/admin/hpay/participants/${id}`);
      setHpayParticipant360(data.participant360||null);
    }catch(error){setNotice(`Participant 360: ${error.message}`);}
    finally{setHpayParticipantBusy(false);}
  }


  function hpayParticipantDateInRange(value){
    if(!value)return false;
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return false;
    if(hpayParticipantStatementFrom){
      const from=new Date(`${hpayParticipantStatementFrom}T00:00:00`);
      if(d<from)return false;
    }
    if(hpayParticipantStatementTo){
      const to=new Date(`${hpayParticipantStatementTo}T23:59:59.999`);
      if(d>to)return false;
    }
    return true;
  }

  function hpayParticipantProgramMatch(row){
    if(hpayParticipantStatementProgram==='all')return true;
    return row?.program_key===hpayParticipantStatementProgram;
  }

  function getFilteredParticipantStatement(){
    const p=hpayParticipant360;
    if(!p?.account)return {earnings:[],settlements:[],ledger:[],vendorSettlements:[]};

    const earnings=(p.earnings||[]).filter(e=>
      hpayParticipantDateInRange(e.occurred_at||e.created_at) &&
      hpayParticipantProgramMatch(e)
    );

    const settlements=(p.settlements||[]).filter(s=>
      hpayParticipantDateInRange(s.created_at) &&
      hpayParticipantProgramMatch(s)
    );

    const ledger=(p.ledger||[]).filter(l=>
      hpayParticipantDateInRange(l.created_at) &&
      hpayParticipantProgramMatch(l)
    );

    const vendorSettlements=(p.vendorSettlements||[]).filter(s=>
      hpayParticipantDateInRange(s.created_at) &&
      (hpayParticipantStatementProgram==='all'||hpayParticipantStatementProgram==='vendor_commerce')
    );

    return {earnings,settlements,ledger,vendorSettlements};
  }

  function participantStatementTotals(){
    const filtered=getFilteredParticipantStatement();

    const universalGross=filtered.earnings.reduce((a,e)=>a+Number(e.gross_amount||0),0);
    const universalFees=filtered.earnings.reduce((a,e)=>a+Number(e.howdi_fee_amount||0),0);
    const universalDeductions=filtered.earnings.reduce((a,e)=>a+Number(e.other_deduction_amount||0),0);
    const universalIncentives=filtered.earnings.reduce((a,e)=>a+Number(e.incentive_amount||0),0);
    const universalNet=filtered.earnings.reduce((a,e)=>a+Number(e.net_payable_amount||0),0);

    const vendorGross=filtered.vendorSettlements.reduce((a,s)=>a+Number(s.gross_amount||0),0);
    const vendorFees=filtered.vendorSettlements.reduce((a,s)=>a+Number(s.commission_amount||0),0);
    const vendorDeductions=filtered.vendorSettlements.reduce((a,s)=>
      a+
      Number(s.gateway_fee_amount||0)+
      Number(s.delivery_deduction_amount||0)+
      Number(s.tax_withholding_amount||0)-
      Number(s.adjustment_amount||0),0
    );
    const vendorNet=filtered.vendorSettlements.reduce((a,s)=>a+Number(s.net_payable_amount||0),0);

    const settledUniversal=filtered.settlements.reduce((a,s)=>a+Number(s.net_payable_amount||0),0);
    const paidUniversal=filtered.settlements
      .filter(s=>s.status==='PAID')
      .reduce((a,s)=>a+Number(s.net_payable_amount||0),0);

    const paidVendor=filtered.vendorSettlements
      .filter(s=>s.status==='PAID')
      .reduce((a,s)=>a+Number(s.net_payable_amount||0),0);

    return {
      gross:universalGross+vendorGross,
      howdiFee:universalFees+vendorFees,
      deductions:universalDeductions+vendorDeductions,
      incentives:universalIncentives,
      net:universalNet+vendorNet,
      settlementValue:settledUniversal+vendorNet,
      paid:paidUniversal+paidVendor,
      outstanding:(settledUniversal+vendorNet)-(paidUniversal+paidVendor)
    };
  }

  function downloadParticipantStatementCsv(){
    const p=hpayParticipant360;
    if(!p?.account){setNotice('Open a Participant 360 profile first');return;}

    const filtered=getFilteredParticipantStatement();
    const totals=participantStatementTotals();
    const account=p.account;
    const periodLabel=`${hpayParticipantStatementFrom||'All'} to ${hpayParticipantStatementTo||'All'}`;

    const rows=[
      ['HOWDI HPAY PARTICIPANT STATEMENT'],
      ['HPay ID',account.hpay_account_id],
      ['HOWDI ID',account.howdi_id||''],
      ['Participant',account.display_name||''],
      ['Owner Type',account.owner_type],
      ['Owner Reference',account.owner_reference],
      ['Currency',account.currency||'INR'],
      ['Program Filter',hpayParticipantStatementProgram],
      ['Statement Period',periodLabel],
      ['Generated At',new Date().toISOString()],
      [],
      ['SUMMARY'],
      ['Gross',totals.gross.toFixed(2)],
      ['HOWDI Fees',totals.howdiFee.toFixed(2)],
      ['Deductions',totals.deductions.toFixed(2)],
      ['Incentives',totals.incentives.toFixed(2)],
      ['Net',totals.net.toFixed(2)],
      ['Paid',totals.paid.toFixed(2)],
      ['Outstanding',totals.outstanding.toFixed(2)],
      [],
      ['UNIVERSAL EARNINGS'],
      ['Earning Number','Program','Source Type','Source ID','Gross','HOWDI Fee','Incentive','Deduction','Net','Status','Occurred At'],
      ...filtered.earnings.map(e=>[
        e.earning_number,e.program_name,e.source_type,e.source_id,
        Number(e.gross_amount||0).toFixed(2),
        Number(e.howdi_fee_amount||0).toFixed(2),
        Number(e.incentive_amount||0).toFixed(2),
        Number(e.other_deduction_amount||0).toFixed(2),
        Number(e.net_payable_amount||0).toFixed(2),
        e.status,e.occurred_at||e.created_at
      ]),
      [],
      ['UNIVERSAL SETTLEMENTS'],
      ['Settlement Number','Program','Gross','HOWDI Fee','Incentive','Deduction','Net','Status','Payout Batch','Payout Reference','Created At'],
      ...filtered.settlements.map(s=>[
        s.settlement_number,s.program_name,
        Number(s.gross_amount||0).toFixed(2),
        Number(s.howdi_fee_amount||0).toFixed(2),
        Number(s.incentive_amount||0).toFixed(2),
        Number(s.other_deduction_amount||0).toFixed(2),
        Number(s.net_payable_amount||0).toFixed(2),
        s.status,s.batch_number||'',s.payment_reference||s.payout_reference||'',s.created_at
      ]),
      [],
      ['VENDOR COMMERCE SETTLEMENTS'],
      ['Settlement Number','Order','Gross','Commission','Gateway Fee','Delivery','Tax Withholding','Adjustment','Net','Status','Payout Reference','Created At'],
      ...filtered.vendorSettlements.map(s=>[
        s.settlement_number,s.order_id||'',
        Number(s.gross_amount||0).toFixed(2),
        Number(s.commission_amount||0).toFixed(2),
        Number(s.gateway_fee_amount||0).toFixed(2),
        Number(s.delivery_deduction_amount||0).toFixed(2),
        Number(s.tax_withholding_amount||0).toFixed(2),
        Number(s.adjustment_amount||0).toFixed(2),
        Number(s.net_payable_amount||0).toFixed(2),
        s.status,s.payout_reference||'',s.created_at
      ]),
      [],
      ['LEDGER'],
      ['Entry Type','Program','Direction','Amount','Source Type','Source ID','Status','Description','Created At'],
      ...filtered.ledger.map(l=>[
        l.entry_type,l.program_name,l.direction,
        Number(l.amount||0).toFixed(2),
        l.source_type,l.source_id||'',l.status,l.description||'',l.created_at
      ])
    ];

    const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const csv=rows.map(r=>r.map(esc).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const link=document.createElement('a');
    link.href=URL.createObjectURL(blob);
    const safeId=String(account.hpay_account_id||account.id).replace(/[^a-z0-9_-]/gi,'_');
    link.download=`HOWDI_HPay_Statement_${safeId}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  async function loadFinanceStatementPack(closeId=financeStatementCloseId){
    setFinanceStatementBusy(true);
    try{
      const suffix=closeId?`?close_id=${encodeURIComponent(closeId)}`:'';
      const data=await api(`/api/admin/hpay/finance-statements${suffix}`);
      setFinanceStatementPack(data.statementPack||null);
      if(!closeId&&data.statementPack?.close?.id){
        setFinanceStatementCloseId(String(data.statementPack.close.id));
      }
    }catch(error){setNotice(`Finance Statements: ${error.message}`);}
    finally{setFinanceStatementBusy(false);}
  }

  function downloadFinanceStatementCsv(){
    const pack=financeStatementPack;
    if(!pack?.close){setNotice('Load a finance statement first');return;}
    const rows=[
      ['HOWDI HPay Finance Statement'],
      ['Close Number',pack.close.close_number],
      ['Period Start',pack.close.period_start],
      ['Period End',pack.close.period_end],
      ['Status',pack.close.status],
      ['Reconciliation',pack.close.reconciliation_run_number||'',pack.close.reconciliation_status||''],
      [],
      ['Program','Gross','HOWDI Fee','Other Deductions','Settlement Adjustments','Posted Adjustments','Net','Paid','Unpaid'],
      ...(pack.programSummary||[]).map(p=>[
        p.program_name,p.gross,p.howdi_fee,p.other_deductions,p.settlement_adjustment,p.posted_adjustment,p.net,p.paid,p.unpaid
      ]),
      [],
      ['Adjustment Number','Program','Type','Amount','Status','Posting Period','Reason'],
      ...(pack.adjustmentsPosted||[]).map(a=>[
        a.adjustment_number,a.program_key,a.adjustment_type,a.amount,a.status,
        a.posting_period_start?`${a.posting_period_start} to ${a.posting_period_end}`:'',
        a.reason
      ]),
      [],
      ['Reconciliation Issue','Program','Severity','Entity','Reference','Expected','Actual','Status'],
      ...(pack.reconciliationIssues||[]).map(i=>[
        i.issue_type,i.program_key,i.severity,i.entity_type,i.entity_reference||'',
        i.expected_amount??'',i.actual_amount??'',i.status
      ])
    ];

    const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const csv=rows.map(r=>r.map(esc).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const link=document.createElement('a');
    link.href=URL.createObjectURL(blob);
    link.download=`HOWDI_Finance_Statement_${pack.close.close_number||'period'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  async function loadHpayAdjustmentControl(){
    setHpayAdjustmentBusy(true);
    try{
      const data=await api('/api/admin/hpay/adjustments');
      setHpayAdjustmentControl(data.adjustmentControl||null);
    }catch(error){setNotice(`Finance Adjustments: ${error.message}`);}
    finally{setHpayAdjustmentBusy(false);}
  }

  async function createHpayAdjustment(){
    if(!hpayAdjustmentForm.original_close_id||!hpayAdjustmentForm.amount||!hpayAdjustmentForm.reason){
      setNotice('Choose a closed period, enter amount and reason');
      return;
    }
    setHpayAdjustmentBusy(true);
    try{
      const data=await api('/api/admin/hpay/adjustments',{
        method:'POST',
        body:JSON.stringify(hpayAdjustmentForm)
      });
      setNotice(data.message||'Finance adjustment created');
      setHpayAdjustmentForm(v=>({...v,amount:'',source_reference:'',reason:''}));
      await loadHpayAdjustmentControl();
    }catch(error){setNotice(`Finance Adjustments: ${error.message}`);}
    finally{setHpayAdjustmentBusy(false);}
  }

  async function actHpayAdjustment(id,action){
    setHpayAdjustmentBusy(true);
    try{
      const data=await api(`/api/admin/hpay/adjustments/${id}/${action}`,{
        method:'POST',
        body:JSON.stringify({note:hpayAdjustmentNote})
      });
      setNotice(data.message||'Finance adjustment updated');
      await loadHpayAdjustmentControl();
      await loadFinanceClose();
    }catch(error){setNotice(`Finance Adjustments: ${error.message}`);}
    finally{setHpayAdjustmentBusy(false);}
  }

  async function loadHpayExceptionControl(){
    setHpayExceptionBusy(true);
    try{
      const data=await api('/api/admin/hpay/exceptions');
      setHpayExceptionControl(data.exceptionControl||null);
    }catch(error){setNotice(`Finance Exceptions: ${error.message}`);}
    finally{setHpayExceptionBusy(false);}
  }

  async function actHpayException(id,action){
    setHpayExceptionBusy(true);
    try{
      const body={note:hpayExceptionNote,assigned_to:hpayExceptionAssignee};
      const data=await api(`/api/admin/hpay/exceptions/${id}/${action}`,{
        method:'POST',
        body:JSON.stringify(body)
      });
      setNotice(data.message||'Finance exception updated');
      if(['resolve','note'].includes(action))setHpayExceptionNote('');
      await loadHpayExceptionControl();
      await loadHpayReconciliation();
    }catch(error){setNotice(`Finance Exceptions: ${error.message}`);}
    finally{setHpayExceptionBusy(false);}
  }

  async function loadFinanceClose(){
    setFinanceCloseBusy(true);
    try{
      const data=await api('/api/admin/hpay/finance-close');
      setFinanceClose(data.financeClose||null);
    }catch(error){setNotice(`Finance Close: ${error.message}`);}
    finally{setFinanceCloseBusy(false);}
  }

  async function createFinanceClose(){
    if(!financeCloseForm.period_start||!financeCloseForm.period_end){
      setNotice('Choose finance close period start and end');
      return;
    }
    setFinanceCloseBusy(true);
    try{
      const data=await api('/api/admin/hpay/finance-close',{
        method:'POST',
        body:JSON.stringify(financeCloseForm)
      });
      setNotice(data.message||'Finance close created');
      await loadFinanceClose();
      await loadHpayReconciliation();
    }catch(error){setNotice(`Finance Close: ${error.message}`);}
    finally{setFinanceCloseBusy(false);}
  }

  async function actFinanceClose(id,action){
    setFinanceCloseBusy(true);
    try{
      const data=await api(`/api/admin/hpay/finance-close/${id}/${action}`,{
        method:'POST',
        body:JSON.stringify({note:financeCloseForm.note})
      });
      setNotice(data.message||'Finance close updated');
      await loadFinanceClose();
    }catch(error){setNotice(`Finance Close: ${error.message}`);}
    finally{setFinanceCloseBusy(false);}
  }

  async function loadHpayReconciliation(){
    setHpayReconBusy(true);
    try{
      const data=await api('/api/admin/hpay/reconciliation');
      setHpayReconciliation(data.reconciliation||null);
    }catch(error){setNotice(`HPay Reconciliation: ${error.message}`);}
    finally{setHpayReconBusy(false);}
  }

  async function runHpayReconciliation(){
    setHpayReconBusy(true);
    try{
      const data=await api('/api/admin/hpay/reconciliation/run',{method:'POST',body:'{}'});
      setNotice(data.message||'HPay reconciliation complete');
      await loadHpayReconciliation();
      await loadUniversalHpay();
    }catch(error){setNotice(`HPay Reconciliation: ${error.message}`);}
    finally{setHpayReconBusy(false);}
  }

  async function loadUniversalPayoutControl(){
    setUniversalPayoutBusy(true);
    try{
      const data=await api('/api/admin/hpay/payout-control');
      setUniversalPayoutControl(data.control||null);
      setSelectedUniversalSettlements(prev=>prev.filter(id=>(data.control?.eligible||[]).some(s=>Number(s.id)===Number(id))));
    }catch(error){setNotice(`Payout Control: ${error.message}`);}
    finally{setUniversalPayoutBusy(false);}
  }
  async function generateProgramSettlements(programKey){
    setUniversalPayoutBusy(true);
    try{
      const data=await api(`/api/admin/hpay/programs/${encodeURIComponent(programKey)}/generate-settlements`,{method:'POST',body:'{}'});
      setNotice(data.message||'Settlements generated'); await loadUniversalPayoutControl(); await loadUniversalHpay();
    }catch(error){setNotice(`Generate settlements: ${error.message}`);}finally{setUniversalPayoutBusy(false);}
  }
  function toggleUniversalSettlement(id){setSelectedUniversalSettlements(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);}
  async function createUniversalPayoutBatch(){
    const eligible=(universalPayoutControl?.eligible||[]).filter(s=>selectedUniversalSettlements.includes(Number(s.id))&&s.program_key===universalPayoutProgram);
    if(!eligible.length){setNotice('Select eligible settlements for the chosen program');return;}
    setUniversalPayoutBusy(true);
    try{
      const data=await api('/api/admin/hpay/payout-batches',{method:'POST',body:JSON.stringify({program_key:universalPayoutProgram,settlement_ids:eligible.map(s=>Number(s.id)),note:universalPayoutNote})});
      setNotice(data.message||'Payout batch created'); setSelectedUniversalSettlements([]); await loadUniversalPayoutControl();
    }catch(error){setNotice(`Create payout batch: ${error.message}`);}finally{setUniversalPayoutBusy(false);}
  }
  async function actUniversalPayoutBatch(id,action){
    setUniversalPayoutBusy(true);
    try{
      const body={note:universalPayoutNote}; if(action==='mark-paid')body.reference=universalPayoutReference;
      const data=await api(`/api/admin/hpay/payout-batches/${id}/${action}`,{method:'POST',body:JSON.stringify(body)});
      setNotice(data.message||'Payout batch updated'); if(action==='mark-paid')setUniversalPayoutReference(''); await loadUniversalPayoutControl(); await loadUniversalHpay();
    }catch(error){setNotice(`Payout batch: ${error.message}`);}finally{setUniversalPayoutBusy(false);}
  }

  async function loadLearnEarnHpay(){
    setLearnEarnBusy(true);
    try{
      const data=await api('/api/admin/hpay/learn-earn/overview');
      setLearnEarnOverview(data.overview||null);
    }catch(error){setNotice(`Learn & Earn HPay: ${error.message}`);}
    finally{setLearnEarnBusy(false);}
  }

  async function saveLearnRewardRule(){
    if(!learnRewardForm.course_id){setNotice('Choose a learning course first');return;}
    setLearnEarnBusy(true);
    try{
      const data=await api('/api/admin/hpay/learn-earn/reward-rules',{
        method:'POST',
        body:JSON.stringify(learnRewardForm)
      });
      setNotice(data.message||'Learn & Earn reward rule saved');
      setLearnRewardForm({course_id:'',reward_amount:'',reward_status:'DISABLED',admin_note:''});
      await loadLearnEarnHpay();
      await loadUniversalHpay();
    }catch(error){setNotice(`Reward rule: ${error.message}`);}
    finally{setLearnEarnBusy(false);}
  }

  async function syncLearnEarnHpay(){
    setLearnEarnBusy(true);
    try{
      const data=await api('/api/admin/hpay/learn-earn/sync',{method:'POST',body:'{}'});
      setNotice(data.message||'Learn & Earn synced');
      await loadLearnEarnHpay();
      await loadUniversalHpay();
    }catch(error){setNotice(`Learn & Earn sync: ${error.message}`);}
    finally{setLearnEarnBusy(false);}
  }

  async function loadWorkerHpay(){
    setWorkerHpayBusy(true);
    try{
      const data=await api('/api/admin/hpay/worker-services/overview');
      setWorkerHpayRows(Array.isArray(data.workers)?data.workers:[]);
      setNotice(`Worker HPay updated${data.sync?.created?` · ${data.sync.created} new earning(s)`:''}`);
    }catch(error){setNotice(`Worker HPay: ${error.message}`);}
    finally{setWorkerHpayBusy(false);}
  }

  async function generateWorkerSettlements(){
    setWorkerHpayBusy(true);
    try{
      const data=await api('/api/admin/hpay/worker-services/generate-settlements',{method:'POST',body:'{}'});
      setNotice(data.message||'Worker settlements generated');
      await loadWorkerHpay();
      await loadUniversalHpay();
    }catch(error){setNotice(`Worker settlements: ${error.message}`);}
    finally{setWorkerHpayBusy(false);}
  }

  async function loadUniversalHpay(){ setHpayBusy(true); try{ const [o,a]=await Promise.all([api('/api/admin/hpay/overview'),api('/api/admin/hpay/accounts')]); setHpayOverview(o.overview||null); setHpayAccounts(Array.isArray(a.accounts)?a.accounts:[]); setNotice('HPay Finance Center updated'); }catch(error){setNotice(`HPay: ${error.message}`);} finally{setHpayBusy(false);} }

  async function loadPayoutControl(){
    setPayoutBusy(true);
    try{
      const [eligible,batches]=await Promise.all([
        api('/api/admin/payout-batches/eligible'),
        api('/api/admin/payout-batches')
      ]);
      setEligiblePayoutSettlements(Array.isArray(eligible.settlements)?eligible.settlements:[]);
      setPayoutBatches(Array.isArray(batches.batches)?batches.batches:[]);
      setNotice('Payout control updated');
    }catch(error){setNotice(`Payout control: ${error.message}`);}
    finally{setPayoutBusy(false);}
  }

  function togglePayoutSettlement(id){
    setSelectedPayoutSettlementIds(rows=>rows.includes(id)?rows.filter(x=>x!==id):[...rows,id]);
  }

  async function createPayoutBatch(){
    if(!selectedPayoutSettlementIds.length){setNotice('Select at least one approved settlement');return;}
    setPayoutBusy(true);
    try{
      const data=await api('/api/admin/payout-batches',{
        method:'POST',
        body:JSON.stringify({settlement_ids:selectedPayoutSettlementIds,admin_note:payoutNote})
      });
      setNotice(data.message||'Payout batch created');
      setSelectedPayoutSettlementIds([]);
      setPayoutNote('');
      await loadPayoutControl();
    }catch(error){setNotice(`Create payout batch: ${error.message}`);}
    finally{setPayoutBusy(false);}
  }

  async function openPayoutBatch(id){
    setPayoutBusy(true);
    try{
      const data=await api(`/api/admin/payout-batches/${id}`);
      setPayoutBatchDetail(data);
    }catch(error){setNotice(`Payout batch: ${error.message}`);}
    finally{setPayoutBusy(false);}
  }

  async function payoutBatchAction(id,action){
    let payout_reference='';
    let note='';
    if(action==='mark-paid'){
      payout_reference=window.prompt('Enter bank / UTR / payout reference')||'';
      if(!payout_reference.trim())return;
      note=window.prompt('Optional payment note')||'';
    }else if(action==='approve'){
      note=window.prompt('Optional approval note')||'';
    }else if(action==='cancel'){
      if(!window.confirm('Cancel this draft payout batch and release its settlements?'))return;
    }
    setPayoutBusy(true);
    try{
      const data=await api(`/api/admin/payout-batches/${id}/${action}`,{
        method:'POST',
        body:JSON.stringify({payout_reference,note})
      });
      setNotice(data.message||'Payout batch updated');
      setPayoutBatchDetail(null);
      await loadPayoutControl();
    }catch(error){setNotice(`Payout batch: ${error.message}`);}
    finally{setPayoutBusy(false);}
  }

  async function loadReconciliationVendors(){
    setReconBusy(true);
    try{
      const data=await api('/api/admin/commercial/reconciliation/vendors');
      const rows=Array.isArray(data.vendors)?data.vendors:[];
      setReconVendors(rows);
      if(!reconVendorId&&rows[0])setReconVendorId(String(rows[0].id));
      setNotice('Reconciliation vendors loaded');
    }catch(error){setNotice(`Reconciliation: ${error.message}`);}
    finally{setReconBusy(false);}
  }

  async function loadReconciliationStatement(){
    if(!reconVendorId){setNotice('Select a vendor first');return;}
    setReconBusy(true);
    try{
      const data=await api(`/api/admin/commercial/reconciliation/statement?vendor_profile_id=${encodeURIComponent(reconVendorId)}&month=${encodeURIComponent(reconMonth)}`);
      setReconStatement(data.statement||null);
      setNotice('Commercial statement loaded');
    }catch(error){setNotice(`Commercial statement: ${error.message}`);}
    finally{setReconBusy(false);}
  }

  async function addReconciliationNote(){
    if(!reconVendorId||!reconNote.trim()){setNotice('Enter a statement note');return;}
    setReconBusy(true);
    try{
      const data=await api('/api/admin/commercial/reconciliation/statement-note',{
        method:'POST',
        body:JSON.stringify({vendor_profile_id:Number(reconVendorId),month:reconMonth,note:reconNote})
      });
      setNotice(data.message||'Statement note added');
      setReconNote('');
      await loadReconciliationStatement();
    }catch(error){setNotice(`Statement note: ${error.message}`);}
    finally{setReconBusy(false);}
  }

  async function loadCommercialBilling(){
    setCommercialBillingBusy(true);
    try{
      const [o,c]=await Promise.all([
        api('/api/admin/commercial/product-overrides'),
        api('/api/admin/commercial/platform-charges')
      ]);
      setProductOverrides(Array.isArray(o.overrides)?o.overrides:[]);
      setPlatformCharges(Array.isArray(c.charges)?c.charges:[]);
      setPlatformChargeTotals(c.totals||{posted:0,paid:0,waived:0});
      setNotice('Commercial billing updated');
    }catch(error){setNotice(`Commercial billing: ${error.message}`);}
    finally{setCommercialBillingBusy(false);}
  }

  async function sendProductOverride(){
    if(!productOverrideForm.vendor_profile_id||!productOverrideForm.product_id){
      setNotice('Select vendor and enter the product ID first');return;
    }
    setCommercialBillingBusy(true);
    try{
      const data=await api('/api/admin/commercial/product-overrides',{
        method:'POST',
        body:JSON.stringify(productOverrideForm)
      });
      setNotice(data.message||'Product commission offer sent');
      await loadCommercialBilling();
    }catch(error){setNotice(`Product commission: ${error.message}`);}
    finally{setCommercialBillingBusy(false);}
  }

  async function generatePlatformCharges(){
    setCommercialBillingBusy(true);
    try{
      const data=await api('/api/admin/commercial/platform-charges/generate',{
        method:'POST',
        body:JSON.stringify({charge_month:platformChargeMonth})
      });
      setNotice(data.message||'Platform charges generated');
      await loadCommercialBilling();
    }catch(error){setNotice(`Platform billing: ${error.message}`);}
    finally{setCommercialBillingBusy(false);}
  }

  async function updatePlatformCharge(id,action){
    let note='';
    if(action==='waive'){
      note=window.prompt('Reason for waiving this platform charge?')||'';
      if(!note.trim())return;
    }
    setCommercialBillingBusy(true);
    try{
      const data=await api(`/api/admin/commercial/platform-charges/${id}/${action}`,{
        method:'POST',
        body:JSON.stringify({note})
      });
      setNotice(data.message||'Platform charge updated');
      await loadCommercialBilling();
    }catch(error){setNotice(`Platform charge: ${error.message}`);}
    finally{setCommercialBillingBusy(false);}
  }

  async function loadNegotiationCenter(){
    setNegotiationLoading(true);
    try{
      const data=await api('/api/admin/commercial/negotiations');
      setNegotiationRows(Array.isArray(data.negotiations)?data.negotiations:[]);
      setNegotiationSummary(data.summary||{totalVendors:0,freePlan:0,offered:0,countered:0,accepted:0,rejected:0,expired:0});
      setNotice('Commercial Negotiation Center updated');
    }catch(error){setNotice(`Negotiation Center: ${error.message}`);}
    finally{setNegotiationLoading(false);}
  }

  async function openNegotiationDetail(vendorProfileId){
    setNegotiationLoading(true);
    try{
      const data=await api(`/api/admin/commercial/negotiations/${vendorProfileId}`);
      setNegotiationDetail(data);
    }catch(error){setNotice(`Negotiation details: ${error.message}`);}
    finally{setNegotiationLoading(false);}
  }

  function prepareRequote(row){
    setCommercialSelectedVendor(String(row.vendor_profile_id));
    setCommercialOfferForm(v=>({
      ...v,
      agreement_name:row.latest_agreement_name||'HOWDI Revised Commercial Plan',
      commission_type:row.latest_commission_type||'percentage',
      commission_value:String(row.latest_commission_value??0),
      commission_min_amount:row.commission_min_amount==null?'':String(row.commission_min_amount),
      commission_max_amount:row.commission_max_amount==null?'':String(row.commission_max_amount),
      free_commission_days:String(row.latest_free_commission_days??0),
      settlement_cycle_days:String(row.latest_settlement_cycle_days??7),
      negotiation_days:String(row.negotiation_days??7),
      tier_1_monthly_fee:String(row.tier_1_monthly_fee??0),
      tier_2_monthly_fee:String(row.tier_2_monthly_fee??0),
      tier_3_monthly_fee:String(row.tier_3_monthly_fee??0),
      admin_note:row.vendor_counter_note?`Revised after vendor counter: ${row.vendor_counter_note}`:'Revised commercial proposal'
    }));
    setNegotiationFilter('ALL');
    setNotice(`Re-quote prepared for ${row.business_name}. Review the values above and send a new version.`);
    document.querySelector('.commercial-offer-editor')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function loadCommercialVendors(){
    setCommercialBusy(true);
    try{
      const data=await api('/api/admin/commercial/vendors');
      const rows=Array.isArray(data.vendors)?data.vendors:[];
      setCommercialVendors(rows);
      if(!commercialSelectedVendor&&rows[0])setCommercialSelectedVendor(String(rows[0].id));
      setNotice('Vendor commercial agreements loaded');
    }catch(error){setNotice(`Commercial terms: ${error.message}`);}
    finally{setCommercialBusy(false);}
  }

  async function sendCommercialOffer(){
    if(!commercialSelectedVendor){setNotice('Select a vendor first');return;}
    setCommercialBusy(true);
    try{
      const data=await api('/api/admin/commercial/offers',{
        method:'POST',
        body:JSON.stringify({
          vendor_profile_id:Number(commercialSelectedVendor),
          ...commercialOfferForm,
          commission_value:Number(commercialOfferForm.commission_value||0),
          commission_min_amount:commercialOfferForm.commission_min_amount,
          commission_max_amount:commercialOfferForm.commission_max_amount,
          free_commission_days:Number(commercialOfferForm.free_commission_days||0),
          settlement_cycle_days:Number(commercialOfferForm.settlement_cycle_days||7),
          negotiation_days:Number(commercialOfferForm.negotiation_days||7),
          tier_1_monthly_fee:Number(commercialOfferForm.tier_1_monthly_fee||0),
          tier_2_monthly_fee:Number(commercialOfferForm.tier_2_monthly_fee||0),
          tier_3_monthly_fee:Number(commercialOfferForm.tier_3_monthly_fee||0),
          vendor_discount_cap_percent:Number(commercialOfferForm.vendor_discount_cap_percent||0)
        })
      });
      setNotice(data.message||'Commercial offer sent');
      await loadCommercialVendors();
    }catch(error){setNotice(`Commercial offer: ${error.message}`);}
    finally{setCommercialBusy(false);}
  }

  async function loadCommercialTimeline(id){
    try{
      const data=await api(`/api/admin/commercial/agreements/${id}/timeline`);
      setCommercialTimeline(Array.isArray(data.events)?data.events:[]);
    }catch(error){setNotice(`Commercial timeline: ${error.message}`);}
  }

  async function loadLogisticsProviders(){
    setLogisticsProviderBusy(true);
    try{
      const data=await api('/api/admin/logistics/providers');
      setLogisticsProviders(Array.isArray(data.providers)?data.providers:[]);
      setLogisticsZones(Array.isArray(data.zones)?data.zones:[]);
      setLogisticsHubs(Array.isArray(data.hubs)?data.hubs:[]);
      setNotice('Logistics provider foundation loaded');
    }catch(error){
      setNotice(`Logistics providers: ${error.message}`);
    }finally{
      setLogisticsProviderBusy(false);
    }
  }

  async function toggleLogisticsProvider(providerKey,isEnabled){
    setLogisticsProviderBusy(true);
    try{
      const data=await api(`/api/admin/logistics/providers/${providerKey}`,{
        method:'PATCH',
        body:JSON.stringify({is_enabled:isEnabled})
      });
      setNotice(data.message||'Provider updated');
      await loadLogisticsProviders();
    }catch(error){
      setNotice(`Provider update: ${error.message}`);
    }finally{
      setLogisticsProviderBusy(false);
    }
  }

  async function loadDeliveryHealth(){
    setDeliveryHealthBusy(true);
    try{
      const data=await api('/api/admin/logistics/health');
      setDeliveryHealth(data);
      setNotice(data.readiness==='READY'
        ?'Delivery Control Center: READY'
        :'Delivery Control Center: attention required');
    }catch(error){
      setNotice(`Delivery Control Center: ${error.message}`);
    }finally{
      setDeliveryHealthBusy(false);
    }
  }

  async function loadTrackingReconcileRuns(){
    setTrackingHistoryBusy(true);
    try{
      const data=await api('/api/admin/logistics/reconcile-runs');
      const runs=Array.isArray(data.runs)?data.runs:[];
      setTrackingReconcileRuns(runs);
      setNotice(data.message||`Loaded ${runs.length} reconciliation run(s)`);
    }catch(error){
      setNotice(`Tracking history: ${error.message}`);
    }finally{
      setTrackingHistoryBusy(false);
    }
  }

  async function reconcileShiprocketTracking(){
    setTrackingReconcileBusy(true);
    try{
      const data=await api('/api/admin/logistics/reconcile-tracking',{method:'POST'});
      setNotice(data.message||'Tracking reconciliation completed');
      await Promise.all([
        loadLogistics(),
        loadDeliveryExceptions(deliveryExceptionFilter),
        loadTrackingReconcileRuns()
      ]);
    }catch(error){
      setNotice(`Tracking reconciliation: ${error.message}`);
    }finally{
      setTrackingReconcileBusy(false);
    }
  }

  async function loadUsers() {
    if (!token) return;
    setUsersLoading(true);
    try {
      const data = await api('/api/admin/users');
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setNotice(e.message || 'Unable to load HOWDI customers.');
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadAll() {
    const results = await Promise.allSettled([
      api('/api/admin/categories'),
      api('/api/admin/subcategories'),
      api('/api/admin/products'),
      api('/api/admin/users')
    ]);
    const [c, s, p, u] = results;
    const failures = [];

    if (c.status === 'fulfilled') setCategories(c.value.categories || []);
    else failures.push(`Categories: ${c.reason?.message || 'failed to load'}`);

    if (s.status === 'fulfilled') setSubcategories(s.value.subcategories || []);
    else failures.push(`Subcategories: ${s.reason?.message || 'failed to load'}`);

    if (p.status === 'fulfilled') setProducts(p.value.products || []);
    else failures.push(`Products: ${p.reason?.message || 'failed to load'}`);

    if (u.status === 'fulfilled') setUsers(Array.isArray(u.value.users) ? u.value.users : []);
    else failures.push(`Users: ${u.reason?.message || 'failed to load'}`);

    setNotice(failures.length ? failures.join(' · ') : '');
  }

  const ACCOUNT_STATUSES = ['PENDING','ACTIVE','SUSPENDED','BLOCKED','INACTIVE','DELETED'];

  function getAccountStatus(user) {
    if (user?.account_status) return String(user.account_status).toUpperCase();
    return user?.is_active === false ? 'INACTIVE' : 'ACTIVE';
  }

  function statusClass(status) {
    return String(status || 'ACTIVE').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  }

  async function loadIdentityHistory(userId) {
    try {
      const data = await api(`/api/admin/users/${encodeURIComponent(userId)}/status-history`);
      setIdentityHistory(Array.isArray(data.history) ? data.history : (Array.isArray(data.status_history) ? data.status_history : []));
    } catch {
      setIdentityHistory([]);
    }
  }

  async function openIdentity(user) {
    setSelectedIdentity(user);
    setStatusReason('');
    setIdentityHistory([]);
    setIdentityLoading(true);

    try {
      const data = await api(`/api/admin/users/${encodeURIComponent(user.id)}/identity`);
      const identity = data.identity || data.user || user;
      setSelectedIdentity({ ...user, ...identity });
      if (Array.isArray(data.history)) setIdentityHistory(data.history);
      else await loadIdentityHistory(user.id);
    } catch {
      // Compatibility fallback: the existing users API is still enough to
      // display the identity record even if a detail endpoint is unavailable.
      await loadIdentityHistory(user.id);
    } finally {
      setIdentityLoading(false);
    }
  }

  async function changeAccountStatus(user, accountStatus) {
    const nextStatus = String(accountStatus || '').toUpperCase();
    if (!ACCOUNT_STATUSES.includes(nextStatus)) {
      setNotice('Please select a valid account status.');
      return;
    }

    setStatusUpdating(true);
    try {
      const data = await api(`/api/admin/users/${encodeURIComponent(user.id)}/status`, {
        method:'PUT',
        body:JSON.stringify({
          account_status: nextStatus,
          is_active: nextStatus === 'ACTIVE',
          reason: statusReason
        })
      });

      const updated = data.user || { ...user, account_status: nextStatus, is_active: nextStatus === 'ACTIVE' };
      setUsers(items => items.map(item => String(item.id) === String(user.id) ? { ...item, ...updated } : item));
      setSelectedIdentity(current => current && String(current.id) === String(user.id) ? { ...current, ...updated } : current);
      setNotice(`${updated.full_name || user.full_name || 'HOWDI account'} is now ${getAccountStatus(updated)}.`);
      setStatusReason('');
      await loadIdentityHistory(user.id);
    } catch (e) {
      setNotice(e.message || 'Unable to update account status.');
    } finally {
      setStatusUpdating(false);
    }
  }

  async function copyText(value, label='Copied') {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      setNotice(`${label} copied.`);
    } catch {
      setNotice('Copy is not available in this browser.');
    }
  }

  const userStats = useMemo(() => ({
    total: users.length,
    howdiIds: users.filter(u => String(u.howdi_id || '').trim()).length,
    active: users.filter(u => getAccountStatus(u) === 'ACTIVE').length,
    protected: users.filter(u => ['SUSPENDED','BLOCKED'].includes(getAccountStatus(u))).length,
    inactive: users.filter(u => ['INACTIVE','DELETED'].includes(getAccountStatus(u))).length,
    team: users.filter(u => String(u.role || '').toLowerCase() !== 'customer').length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter(user => {
      const status = getAccountStatus(user);
      const statusOk = userStatusFilter === 'all'
        || status === userStatusFilter
        || (userStatusFilter === 'team' && String(user.role || '').toLowerCase() !== 'customer');

      const haystack = [
        user.full_name,
        user.howdi_id,
        user.master_id,
        user.identity_uuid,
        user.user_identity_uuid,
        user.id,
        user.email,
        user.phone,
        user.role,
        user.account_type_code,
        user.account_type,
        status
      ].filter(Boolean).join(' ').toLowerCase();

      return statusOk && (!q || haystack.includes(q));
    });
  }, [users, userSearch, userStatusFilter]);

  useEffect(() => { if (token) loadAll(); }, [token]);

  async function login(e) {
    e.preventDefault(); setLoginError('');
    try {
      const response = await fetch(`${API}/api/admin/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Invalid admin credentials');
      localStorage.setItem('howdiAdminToken', data.token);
      setToken(data.token);
    } catch (e) { setLoginError(e.message); }
  }

  async function saveCategory(e) {
    e.preventDefault(); setNotice('');
    try {
      const path = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const data = await api(path, { method: editingCategory ? 'PUT':'POST', body:JSON.stringify(categoryForm) });
      setCategories(items => editingCategory ? items.map(x => x.id===data.category.id ? data.category : x) : [...items, data.category]);
      setCategoryForm({name:'',icon:'🧶',description:'',visible:true,showOnHome:true});
      setEditingCategory(null); setNotice('Category saved.');
    } catch(e) { setNotice(e.message); }
  }

  async function saveSubcategory(e) {
    e.preventDefault(); setNotice('');
    try {
      const path = editingSubcategory ? `/api/admin/subcategories/${editingSubcategory.id}` : '/api/admin/subcategories';
      const data = await api(path, { method: editingSubcategory ? 'PUT':'POST', body:JSON.stringify(subcategoryForm) });
      setSubcategories(items => editingSubcategory ? items.map(x => x.id===data.subcategory.id ? data.subcategory : x) : [...items, data.subcategory]);
      setSubcategoryForm({categoryId:categories[0]?.id||'',name:'',icon:'🧶',visible:true});
      setEditingSubcategory(null); setNotice('Subcategory saved.');
    } catch(e) { setNotice(e.message); }
  }

  async function toggleCategory(item) {
    try {
      const data=await api(`/api/admin/categories/${item.id}`,{method:'PUT',body:JSON.stringify({visible:!item.visible})});
      setCategories(xs=>xs.map(x=>x.id===item.id?data.category:x));
      setNotice(`${item.name} is now ${data.category.visible?'visible':'hidden'}.`);
    } catch(e){setNotice(e.message)}
  }

  async function toggleSubcategory(item) {
    try {
      const data=await api(`/api/admin/subcategories/${item.id}`,{method:'PUT',body:JSON.stringify({visible:!item.visible})});
      setSubcategories(xs=>xs.map(x=>x.id===item.id?data.subcategory:x));
      setNotice(`${item.name} is now ${data.subcategory.visible?'visible':'hidden'}.`);
    } catch(e){setNotice(e.message)}
  }

  async function toggleProduct(item) {
    try {
      const data=await api(`/api/admin/products/${item.id}`,{method:'PUT',body:JSON.stringify({visible:!item.visible})});
      setProducts(xs=>xs.map(x=>x.id===item.id?data.product:x));
      setNotice(`${item.name} is now ${data.product.visible?'visible':'hidden'}.`);
    } catch(e){setNotice(e.message)}
  }


  function persistOrders(nextOrders) { setOrders(nextOrders); localStorage.setItem('howdiAdminOrders', JSON.stringify(nextOrders)); }
  function orderStatusLabel(status) {
    return ({ pending:'Payment pending', confirmed:'Confirmed', processing:'Processing', packed:'Packed', shipped:'Shipped', out_for_delivery:'Out for delivery', delivered:'Delivered', cancelled:'Cancelled', returned:'Returned', refunded:'Refunded' })[status] || 'Confirmed';
  }
  function orderStatusClass(status) { return String(status || 'confirmed').replaceAll('_','-'); }
  function formatOrderAmount(value) { return `₹${Number(value || 0).toLocaleString('en-IN')}`; }
  async function loadOrdersLive(){
    setOrdersLoading(true);
    try{
      const [data,shipmentData,rateData]=await Promise.all([api('/api/admin/orders'),api('/api/admin/shipments').catch(()=>({shipments:[]})),api('/api/admin/delivery-rates').catch(()=>({rates:[]}))]);
      setShipments(Array.isArray(shipmentData.shipments)?shipmentData.shipments:[]);
      setDeliveryRates(Array.isArray(rateData.rates)?rateData.rates:[]);
      const next=Array.isArray(data.orders)?data.orders:[];
      setOrders(next);
      localStorage.setItem('howdiAdminOrders',JSON.stringify(next));
      setSelectedOrder(current=>current?next.find(x=>String(x.id)===String(current.id))||null:current);
    }catch(error){
      setNotice(`Orders backend: ${error.message}`);
    }finally{setOrdersLoading(false);}
  }

  async function updateOrderStatus(order,status){
    try{
      await api(`/api/admin/orders/${order.id}/status`,{method:'PATCH',body:JSON.stringify({status})});
      await loadOrdersLive();
      setNotice(`${order.orderNumber || order.id || 'Order'} updated to ${orderStatusLabel(status)}.`);
    }catch(error){
      setNotice(`Order status update failed: ${error.message}`);
    }
  }
  function addDemoOrder() {
    const id = `ORD-${Date.now().toString().slice(-8)}`;
    const customer = users[0] || {};
    const product = products[0] || {};
    const demo = { id, orderNumber:id, customerName:customer.full_name || 'Demo Customer', howdiId:customer.howdi_id || '', customerEmail:customer.email || '', customerPhone:customer.phone || '', items:[{ name:product.name || 'HOWDI Product', qty:1, price:Number(product.offerPrice || product.sellingPrice || product.mrp || 0), variant:'Standard' }], subtotal:Number(product.offerPrice || product.sellingPrice || product.mrp || 0), discount:0, deliveryCharge:0, total:Number(product.offerPrice || product.sellingPrice || product.mrp || 0), paymentStatus:'paid', paymentMethod:'Online payment', status:'confirmed', shippingAddress:{ name:customer.full_name || 'Demo Customer', city:'', state:'', pincode:'' }, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    const next=[demo,...orders]; persistOrders(next); setSelectedOrder(demo); setNotice('Demo order added for workflow testing. Real checkout orders will appear here after checkout is connected.');
  }

  function persistCoupons(nextCoupons) { setCoupons(nextCoupons); localStorage.setItem('howdiAdminCoupons', JSON.stringify(nextCoupons)); }
  function generateCouponCode() {
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code='';
    do { code='HOWDI-'; for(let i=0;i<6;i+=1) code += chars[Math.floor(Math.random()*chars.length)]; }
    while(coupons.some(item=>String(item.code).toUpperCase()===code));
    setCouponForm(current=>({...current,code}));
  }
  function getCouponStatus(coupon) {
    if(!coupon.active) return 'PAUSED'; const now=new Date();
    if(coupon.startDate){const start=new Date(coupon.startDate); if(!Number.isNaN(start.getTime()) && start>now) return 'SCHEDULED';}
    if(coupon.endDate){const end=new Date(coupon.endDate); if(!Number.isNaN(end.getTime())){if(end<now)return 'EXPIRED'; if((end.getTime()-now.getTime())/36e5<=72)return 'ENDING SOON';}}
    return 'LIVE';
  }
  function resetCouponForm(){setCouponForm({code:'',campaignName:'',discountType:'percentage',discountValue:'',minimumOrderValue:'',maximumDiscount:'',startDate:'',endDate:'',usageLimit:'',perCustomerLimit:'1',firstOrderOnly:false,active:true});setEditingCoupon(null);}
  function persistLocations(nextLocations) { setLocations(nextLocations); localStorage.setItem('howdiAdminLocations', JSON.stringify(nextLocations)); }
  function resetLocationForm() { setLocationForm({ pincode:'', city:'', state:'', country:'India', serviceable:true, active:true, standardCharge:'49', expressAvailable:false, expressCharge:'99', freeDeliveryAbove:'999', estimatedDaysMin:'3', estimatedDaysMax:'5' }); setEditingLocation(null); }
  function saveLocation(e) {
    e.preventDefault();
    const pincode=String(locationForm.pincode||'').trim();
    const city=String(locationForm.city||'').trim();
    const state=String(locationForm.state||'').trim();
    if(!/^\d{6}$/.test(pincode)){setNotice('Enter a valid 6-digit Indian pincode.');return;}
    if(!city || !state){setNotice('City and state are required.');return;}
    const duplicate=locations.some(item=>String(item.pincode)===pincode && item.id!==editingLocation?.id);
    if(duplicate){setNotice('This pincode already exists. Edit the existing location instead.');return;}
    const next={...locationForm,id:editingLocation?.id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,pincode,city,state,country:String(locationForm.country||'India').trim()||'India',standardCharge:Number(locationForm.standardCharge||0),expressCharge:Number(locationForm.expressCharge||0),freeDeliveryAbove:Number(locationForm.freeDeliveryAbove||0),estimatedDaysMin:Number(locationForm.estimatedDaysMin||0),estimatedDaysMax:Number(locationForm.estimatedDaysMax||0),createdAt:editingLocation?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(next.estimatedDaysMax && next.estimatedDaysMin && next.estimatedDaysMax<next.estimatedDaysMin){setNotice('Maximum delivery days cannot be less than minimum delivery days.');return;}
    const nextLocations=editingLocation?locations.map(item=>item.id===next.id?next:item):[next,...locations];
    persistLocations(nextLocations); setNotice(editingLocation?'Location updated successfully.':'Pincode and delivery rule created successfully.'); resetLocationForm();
  }
  function editLocation(item){setEditingLocation(item);setLocationForm({pincode:item.pincode||'',city:item.city||'',state:item.state||'',country:item.country||'India',serviceable:item.serviceable!==false,active:item.active!==false,standardCharge:String(item.standardCharge??49),expressAvailable:!!item.expressAvailable,expressCharge:String(item.expressCharge??99),freeDeliveryAbove:String(item.freeDeliveryAbove??999),estimatedDaysMin:String(item.estimatedDaysMin??3),estimatedDaysMax:String(item.estimatedDaysMax??5)});setTab('locations');window.scrollTo({top:0,behavior:'smooth'});}
  function toggleLocationActive(item){const nextLocations=locations.map(x=>x.id===item.id?{...x,active:!item.active,updatedAt:new Date().toISOString()}:x);persistLocations(nextLocations);setNotice(`${item.pincode} is now ${item.active?'inactive':'active'}.`);}
  function toggleLocationService(item){const nextLocations=locations.map(x=>x.id===item.id?{...x,serviceable:!item.serviceable,updatedAt:new Date().toISOString()}:x);persistLocations(nextLocations);setNotice(`${item.pincode} is now ${item.serviceable?'non-serviceable':'serviceable'}.`);}
  function deleteLocation(item){if(!window.confirm(`Delete pincode ${item.pincode}?`))return;persistLocations(locations.filter(x=>x.id!==item.id));if(editingLocation?.id===item.id)resetLocationForm();setNotice('Location deleted.');}

  function saveCoupon(e){
    e.preventDefault(); const code=couponForm.code.trim().toUpperCase();
    if(!code){setNotice('Enter or generate a coupon code.');return;}
    if(!couponForm.discountValue || Number(couponForm.discountValue)<=0){setNotice('Enter a valid discount value.');return;}
    const duplicate=coupons.some(item=>String(item.code).toUpperCase()===code && item.id!==editingCoupon?.id);
    if(duplicate){setNotice('This coupon code already exists. Generate or enter a different code.');return;}
    const nextCoupon={...couponForm,id:editingCoupon?.id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,code,discountValue:Number(couponForm.discountValue),minimumOrderValue:Number(couponForm.minimumOrderValue||0),maximumDiscount:Number(couponForm.maximumDiscount||0),usageLimit:Number(couponForm.usageLimit||0),perCustomerLimit:Math.max(1,Number(couponForm.perCustomerLimit||1)),createdAt:editingCoupon?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const nextCoupons=editingCoupon?coupons.map(item=>item.id===nextCoupon.id?nextCoupon:item):[nextCoupon,...coupons];
    persistCoupons(nextCoupons); setNotice(editingCoupon?'Coupon updated successfully.':'Coupon created successfully.'); resetCouponForm();
  }
  function editCoupon(coupon){setEditingCoupon(coupon);setCouponForm({code:coupon.code||'',campaignName:coupon.campaignName||'',discountType:coupon.discountType||'percentage',discountValue:coupon.discountValue??'',minimumOrderValue:coupon.minimumOrderValue??'',maximumDiscount:coupon.maximumDiscount??'',startDate:coupon.startDate||'',endDate:coupon.endDate||'',usageLimit:coupon.usageLimit??'',perCustomerLimit:coupon.perCustomerLimit??'1',firstOrderOnly:Boolean(coupon.firstOrderOnly),active:coupon.active!==false});setTab('coupons');}
  function toggleCoupon(coupon){persistCoupons(coupons.map(item=>item.id===coupon.id?{...item,active:!item.active}:item));setNotice(`${coupon.code} is now ${coupon.active?'paused':'active'}.`);}
  function deleteCoupon(coupon){if(!window.confirm(`Delete coupon "${coupon.code}"?`))return;persistCoupons(coupons.filter(item=>item.id!==coupon.id));setNotice('Coupon deleted.');}
  const filteredCoupons=coupons.filter(coupon=>{const q=couponSearch.trim().toLowerCase();return !q||[coupon.code,coupon.campaignName].filter(Boolean).join(' ').toLowerCase().includes(q);});

  function persistInventoryMoves(nextMoves) { setInventoryMoves(nextMoves); localStorage.setItem('howdiAdminInventoryMoves', JSON.stringify(nextMoves)); }
  function saveInventoryMove(e) {
    e.preventDefault(); setNotice('');
    const variant=variants.find(v=>String(v.id)===String(inventoryForm.variantId));
    if(!variant){ setNotice('Select a variant first.'); return; }
    const qty=Number(inventoryForm.quantity||0);
    if(!Number.isFinite(qty) || qty<0){ setNotice('Enter a valid stock quantity.'); return; }
    const before=Number(variant.stock||0);
    let after=before;
    if(inventoryForm.mode==='in'){ if(qty<=0){setNotice('Stock In quantity must be greater than 0.');return;} after=before+qty; }
    if(inventoryForm.mode==='out'){ if(qty<=0){setNotice('Stock Out quantity must be greater than 0.');return;} if(qty>before){setNotice('Stock Out cannot exceed available stock.');return;} after=before-qty; }
    if(inventoryForm.mode==='set'){ after=qty; }
    const move={ id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`, variantId:variant.id, sku:variant.sku, productId:variant.productId, productName:variantProductName(variant.productId), color:variant.color||'', size:variant.size||'', mode:inventoryForm.mode, quantity:qty, before, after, delta:after-before, reason:String(inventoryForm.reason||'').trim()||'Manual inventory update', reference:String(inventoryForm.reference||'').trim(), createdAt:new Date().toISOString() };
    persistVariants(variants.map(v=>v.id===variant.id?{...v,stock:after,updatedAt:new Date().toISOString()}:v));
    persistInventoryMoves([move,...inventoryMoves]);
    setInventoryForm({ variantId:'', mode:'in', quantity:'', reason:'', reference:'' });
    setNotice(`Inventory updated: ${variant.sku} is now ${after} in stock.`);
  }
  function inventoryVariantLabel(v){ return `${variantProductName(v.productId)} · ${v.sku}${v.color?` · ${v.color}`:''}${v.size?` / ${v.size}`:''}`; }
  function persistVariants(nextVariants) { setVariants(nextVariants); localStorage.setItem('howdiAdminVariants', JSON.stringify(nextVariants)); }
  function resetVariantForm(){ setVariantForm({ productId:products[0]?.id||'', color:'', size:'', sku:'', regularPrice:'', offerPrice:'', discountPercent:'', stock:'', lowStockThreshold:'5', active:true }); setEditingVariant(null); }
  function variantProductName(id){ return products.find(p=>String(p.id)===String(id))?.name || 'Unknown product'; }
  function generateVariantSku(){
    const product = products.find(p=>String(p.id)===String(variantForm.productId));
    const base = String(product?.name||'HOWDI').replace(/[^a-z0-9]/gi,'').slice(0,6).toUpperCase() || 'HOWDI';
    const color = String(variantForm.color||'VAR').replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase() || 'VAR';
    const size = String(variantForm.size||'ONE').replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase() || 'ONE';
    let sku=''; do { sku=`HOWDI-${base}-${color}-${size}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; } while(variants.some(v=>String(v.sku).toUpperCase()===sku && v.id!==editingVariant?.id));
    setVariantForm(current=>({...current,sku}));
  }
  function updateVariantRegularPrice(value){
    const regularPrice=value; const discount=Number(variantForm.discountPercent||0); const offer=Number(regularPrice||0)*(1-discount/100);
    setVariantForm(current=>({...current,regularPrice,offerPrice:discount>0?offer.toFixed(2):current.offerPrice}));
  }
  function updateVariantOfferPrice(value){
    const regular=Number(variantForm.regularPrice||0); const offer=Number(value||0); const discount=regular>0 && offer>=0 && offer<=regular ? ((regular-offer)/regular)*100 : 0;
    setVariantForm(current=>({...current,offerPrice:value,discountPercent:regular>0?discount.toFixed(2):''}));
  }
  function updateVariantDiscount(value){
    const discount=Math.min(100,Math.max(0,Number(value||0))); const regular=Number(variantForm.regularPrice||0); const offer=regular>0 ? regular*(1-discount/100) : 0;
    setVariantForm(current=>({...current,discountPercent:value,offerPrice:regular>0?offer.toFixed(2):current.offerPrice}));
  }
  function saveVariant(e){
    e.preventDefault();
    if(!variantForm.productId){setNotice('Select a product for this variant.');return;}
    const sku=variantForm.sku.trim().toUpperCase();
    if(!sku){setNotice('Enter or generate a unique SKU.');return;}
    const duplicate=variants.some(v=>String(v.sku).toUpperCase()===sku && v.id!==editingVariant?.id);
    if(duplicate){setNotice('This SKU already exists. Generate or enter a different SKU.');return;}
    const regularPrice=Number(variantForm.regularPrice||0); const offerPrice=Number(variantForm.offerPrice||0); const stock=Number(variantForm.stock||0); const threshold=Math.max(0,Number(variantForm.lowStockThreshold||5));
    if(regularPrice<=0){setNotice('Enter a valid regular price.');return;}
    if(offerPrice<0 || offerPrice>regularPrice){setNotice('Offer price must be between ₹0 and the regular price.');return;}
    if(stock<0){setNotice('Stock cannot be negative.');return;}
    const discountPercent=regularPrice>0 && offerPrice>0 ? Number((((regularPrice-offerPrice)/regularPrice)*100).toFixed(2)) : Number(variantForm.discountPercent||0);
    const next={...variantForm,id:editingVariant?.id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,sku,regularPrice,offerPrice:offerPrice||regularPrice,discountPercent:offerPrice>0?discountPercent:0,stock,lowStockThreshold:threshold,active:variantForm.active!==false,createdAt:editingVariant?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    persistVariants(editingVariant?variants.map(v=>v.id===next.id?next:v):[next,...variants]); setNotice(editingVariant?'Variant updated successfully.':'Variant created successfully.'); resetVariantForm();
  }
  function editVariant(v){setEditingVariant(v);setVariantForm({productId:v.productId||'',color:v.color||'',size:v.size||'',sku:v.sku||'',regularPrice:v.regularPrice??'',offerPrice:v.offerPrice??'',discountPercent:v.discountPercent??'',stock:v.stock??'',lowStockThreshold:v.lowStockThreshold??'5',active:v.active!==false});setTab('variants');}
  function toggleVariant(v){persistVariants(variants.map(item=>item.id===v.id?{...item,active:!item.active,updatedAt:new Date().toISOString()}:item));setNotice(`${v.sku} is now ${v.active?'inactive':'active'}.`);}
  function deleteVariant(v){if(!window.confirm(`Delete variant ${v.sku}?`))return;persistVariants(variants.filter(item=>item.id!==v.id));setNotice('Variant deleted.');}
  const filteredVariants=variants.filter(v=>{const q=variantSearch.trim().toLowerCase();return !q||[v.sku,v.color,v.size,variantProductName(v.productId)].filter(Boolean).join(' ').toLowerCase().includes(q);});


  function openProductStudio(product=null){
    if(product){
      setEditingProduct(product);
      setProductForm({
        ...blankProductForm(),
        ...product,
        tags:Array.isArray(product.tags)?product.tags.join(', '):String(product.tags||''),
        media:Array.isArray(product.media)?product.media:[],
        specifications:Array.isArray(product.specifications)?product.specifications:[],
        summary:product.summary||product.shortSummary||'',
        usage:product.usage||'',
        care:product.care||'',
        unit:product.unit||'piece',
        inventoryType:product.inventoryType||'simple',
        sizeType:product.sizeType||'standard',
        freeSize:Boolean(product.freeSize),
        washable:Boolean(product.washable),
        ironable:Boolean(product.ironable),
        returnable:product.returnable!==false,
        customizationAvailable:Boolean(product.customizationAvailable),
        visible:product.visible!==false,
      });
    }else{
      setEditingProduct(null);
      setProductForm(blankProductForm());
    }
    setProductStudioSection('media');
    setProductStudioOpen(true);
    setTab('products');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function closeProductStudio(){
    setProductStudioOpen(false);
    setEditingProduct(null);
    setProductForm(blankProductForm());
  }

  function setProductField(key,value){
    setProductForm(current=>({...current,[key]:value}));
  }

  function addSpecification(){
    setProductForm(current=>({...current,specifications:[...(current.specifications||[]),{label:'',value:''}]}));
  }

  function updateSpecification(index,key,value){
    setProductForm(current=>({...current,specifications:(current.specifications||[]).map((item,i)=>i===index?{...item,[key]:value}:item)}));
  }

  function removeSpecification(index){
    setProductForm(current=>({...current,specifications:(current.specifications||[]).filter((_,i)=>i!==index)}));
  }

  function generateProductSku(){
    const base=String(productForm.name||productForm.brand||'HOWDI').replace(/[^a-z0-9]/gi,'').slice(0,10).toUpperCase()||'HOWDI';
    let sku='';
    do { sku=`HOWDI-${base}-${Math.random().toString(36).slice(2,8).toUpperCase()}`; }
    while(products.some(item=>String(item.sku||'').toUpperCase()===sku && item.id!==editingProduct?.id));
    setProductField('sku',sku);
  }

  async function readAndCompressImage(file){
    const source=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=reject;
      reader.readAsDataURL(file);
    });
    if(!String(file.type||'').startsWith('image/')) return {id:`media-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,url:source,name:file.name,type:file.type,size:file.size};
    const image=await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=reject;
      img.src=source;
    });
    const max=1400;
    const scale=Math.min(1,max/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.width*scale));
    canvas.height=Math.max(1,Math.round(image.height*scale));
    const ctx=canvas.getContext('2d');
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const url=canvas.toDataURL('image/jpeg',0.84);
    return {id:`media-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,url,name:file.name,type:'image/jpeg',size:file.size};
  }

  async function addProductMedia(files){
    const selected=Array.from(files||[]).slice(0,8);
    if(!selected.length) return;
    try{
      const next=await Promise.all(selected.map(readAndCompressImage));
      setProductForm(current=>({...current,media:[...(current.media||[]),...next].slice(0,8)}));
      setNotice(`${next.length} product photo${next.length>1?'s':''} added.`);
    }catch(error){ setNotice('One or more images could not be processed.'); }
  }

  function removeProductMedia(id){
    setProductForm(current=>({...current,media:(current.media||[]).filter(item=>item.id!==id)}));
  }

  function aiAssistProduct(){
    const category=categories.find(c=>String(c.id)===String(productForm.categoryId))?.name||'';
    const subcategory=subcategories.find(c=>String(c.id)===String(productForm.subcategoryId))?.name||'';
    const seed=[productForm.name,productForm.brand,category,subcategory,productForm.material].filter(Boolean).join(' ');
    if(!seed.trim()){ setNotice('Enter a product name or choose a category before using AI Assist.'); return; }
    const words=seed.trim().split(/\s+/).slice(0,10).join(' ');
    const suggestedSummary=productForm.summary || `A carefully selected ${words.toLowerCase()} for everyday use and gifting.`;
    const suggestedDescription=productForm.description || `${words}.\n\nKey highlights\n• Carefully prepared for HOWDI customers\n• Product details can be reviewed before publishing\n• Please confirm material, size and care information before going live`;
    const suggestedUsage=productForm.usage || 'Daily use\nGifting\nPersonal use';
    const nextTags=productForm.tags || [category,subcategory,productForm.brand,productForm.productType].filter(Boolean).join(', ');
    setProductForm(current=>({...current,summary:suggestedSummary,description:suggestedDescription,usage:suggestedUsage,tags:nextTags}));
    setNotice('AI Assist suggestions added. Review them before publishing. Photo-vision AI can be connected next with a provider key.');
  }

  async function saveProduct(e){
    e.preventDefault();
    setNotice('');
    if(!productForm.name.trim()){ setNotice('Product name is required.'); return; }
    if(!productForm.categoryId){ setNotice('Select a product category.'); return; }
    if(productForm.sellingPrice!=='' && Number(productForm.sellingPrice)<0){ setNotice('Selling price cannot be negative.'); return; }
    if(productForm.mrp!=='' && productForm.sellingPrice!=='' && Number(productForm.sellingPrice)>Number(productForm.mrp)){ setNotice('Selling price cannot be greater than MRP.'); return; }
    if(productForm.media.some(item=>String(item.url||'').length>2500000)){ setNotice('One image is too large. Please use a smaller photo.'); return; }
    const payload={
      ...productForm,
      name:productForm.name.trim(),
      summary:productForm.summary.trim(),
      description:productForm.description.trim(),
      brand:productForm.brand.trim(),
      productType:productForm.productType.trim(),
      sku:productForm.sku.trim(),
      tags:productForm.tags.split(',').map(item=>item.trim()).filter(Boolean),
      specifications:(productForm.specifications||[]).filter(item=>String(item.label||'').trim()||String(item.value||'').trim())
    };
    try{
      const path=editingProduct?`/api/admin/products/${editingProduct.id}`:'/api/admin/products';
      const data=await api(path,{method:editingProduct?'PUT':'POST',body:JSON.stringify(payload)});
      setProducts(items=>editingProduct?items.map(item=>item.id===data.product.id?data.product:item):[data.product,...items]);
      setNotice(editingProduct?'Product updated successfully.':'Product published successfully.');
      closeProductStudio();
    }catch(error){ setNotice(error.message); }
  }

  const categoryName = id => categories.find(c=>String(c.id)===String(id))?.name || '—';
  const visibleCategories = categories.filter(x => x.visible !== false).length;
  const visibleSubcategories = subcategories.filter(x => x.visible !== false).length;
  const visibleProducts = products.filter(x => x.visible !== false).length;
  const lowStock = variants.length ? variants.filter(x => Number(x.stock ?? 0) <= Number(x.lowStockThreshold ?? 5)).length : products.filter(x => Number(x.stock ?? 99) <= 5).length;
  const filteredLocations = locations.filter(item => `${item.pincode} ${item.city} ${item.state} ${item.country}`.toLowerCase().includes(locationSearch.toLowerCase().trim()));
  const filteredInventoryMoves = inventoryMoves.filter(m=>{const q=inventorySearch.trim().toLowerCase();return !q||[m.sku,m.productName,m.color,m.size,m.reason,m.reference,m.mode].filter(Boolean).join(' ').toLowerCase().includes(q);});
  const filteredOrders = orders.filter(order => {
    const q=orderSearch.trim().toLowerCase();
    const statusOk=orderStatusFilter==='all' || String(order.status||'confirmed')===orderStatusFilter;
    const haystack=[order.orderNumber,order.id,order.customerName,order.howdiId,order.customerEmail,order.customerPhone].filter(Boolean).join(' ').toLowerCase();
    return statusOk && (!q || haystack.includes(q));
  });
  const orderStats = {
    total:orders.length,
    action:orders.filter(o=>['pending','confirmed','processing','packed'].includes(String(o.status||'confirmed'))).length,
    shipped:orders.filter(o=>['shipped','out_for_delivery'].includes(String(o.status||''))).length,
    delivered:orders.filter(o=>String(o.status||'')==='delivered').length
  };


  const filteredHpay = hpayTransactions.filter(item => {
    const q=hpaySearch.trim().toLowerCase();
    const st=String(item.status||'').toLowerCase();
    const statusOk=hpayStatusFilter==='all'||st===hpayStatusFilter;
    const hay=[item.transaction_id,item.sender_name,item.sender_howdi_id,item.receiver_name,item.receiver_howdi_id,item.method,item.provider_reference,item.client_reference].join(' ').toLowerCase();
    return statusOk&&(!q||hay.includes(q));
  });
  const hpayStats={
    volume:Number(hpayOverview?.stats?.processed_volume||0),
    success:Number(hpayOverview?.stats?.successful||0),
    pending:Number(hpayOverview?.stats?.pending||0),
    failed:Number(hpayOverview?.stats?.failed||0),
    refunds:Number(hpayOverview?.stats?.refunded||0),
    risk:Number(hpayOverview?.risk?.open_risk_alerts||0)
  };
  function mapHPaySettings(row={}){
    return {enabled:row.enabled??true,qr:row.qr_enabled??true,upi:row.upi_enabled??true,bank:row.bank_enabled??true,requests:row.requests_enabled??true,chatPay:row.chat_pay_enabled??true,autoRefund:row.auto_refund_enabled??false,singleLimit:String(row.default_single_limit??'25000'),dailyLimit:String(row.default_daily_limit??'100000')};
  }
  async function loadHPay(){
    setHpayLoading(true);setHpayError('');
    try{
      const [overview,tx,requests,accounts,risk]=await Promise.all([
        api('/api/admin/hpay/overview'),api('/api/admin/hpay/transactions'),api('/api/admin/hpay/requests'),api('/api/admin/hpay/accounts'),api('/api/admin/hpay/risk-events')
      ]);
      setHpayOverview(overview);setHpayTransactions(tx.transactions||[]);setHpayRequests(requests.requests||[]);setHpayUsers(accounts.accounts||[]);setHpayRiskEvents(risk.risk_events||[]);
      const settings=overview.settings||{};setHpaySettings(mapHPaySettings(settings));setHpayRiskMode(String(settings.risk_mode||'BALANCED').toLowerCase());
    }catch(error){setHpayError(error.message||'Unable to load HPay');}finally{setHpayLoading(false);}
  }
  async function saveHpaySettings(next){
    setHpayLoading(true);setHpayError('');
    try{
      const result=await api('/api/admin/hpay/settings',{method:'PUT',body:JSON.stringify({
        enabled:!!next.enabled,qr_enabled:!!next.qr,upi_enabled:!!next.upi,bank_enabled:!!next.bank,requests_enabled:!!next.requests,chat_pay_enabled:!!next.chatPay,auto_refund_enabled:!!next.autoRefund,
        default_single_limit:Number(next.singleLimit),default_daily_limit:Number(next.dailyLimit),risk_mode:String(hpayRiskMode||'balanced').toUpperCase()
      })});
      setHpaySettings(mapHPaySettings(result.settings||{}));setHpayRiskMode(String(result.settings?.risk_mode||hpayRiskMode).toLowerCase());setNotice('HPay settings saved to PostgreSQL.');
      await loadHPay();
    }catch(error){setHpayError(error.message||'Unable to save HPay settings');}finally{setHpayLoading(false);}
  }
  useEffect(()=>{if(tab==='hpay')loadHPay();},[tab]);
  useEffect(()=>{if(tab==='hpay')loadPaymentIntegrity();},[tab]);
  useEffect(()=>{if(tab==='learnEarn'){loadLearnEarnCourses();loadTeacherFoundation();loadLearnCommerce();loadLearnAiReview();loadLearnOpportunityControl();loadLearnAccessControl();loadLearnMarketIntelligence();loadLearnOpportunityPipeline();}},[tab]);
  useEffect(()=>{if(tab==='payments')loadPaymentTransactions();},[tab]);
  // Keep every Admin module opening from the top. Without this, the browser
  // preserves the previous module's scroll position and can hide the hero/header.
  useEffect(()=>{ window.scrollTo(0,0); },[tab]);

  const filteredLearnAiAssets=(learnAiReview.assets||[]).filter(item=>{
    const q=learnAiReviewSearch.trim().toLowerCase();
    const filterOk=learnAiReviewFilter==='ALL'||item.status===learnAiReviewFilter;
    const hay=[
      item.title,item.asset_type,item.teacher_name,item.howdi_id,item.teacher_email,
      item.course_title,item.language,item.status,item.generation_mode,item.model_reference
    ].filter(Boolean).join(' ').toLowerCase();
    return filterOk&&(!q||hay.includes(q));
  });

  const filteredLearnPurchases=(learnCommerce.purchases||[]).filter(item=>{
    const q=learnCommerceSearch.trim().toLowerCase();
    const filterOk=learnCommerceFilter==='ALL'||
      item.payment_status===learnCommerceFilter||
      item.integrity_state===learnCommerceFilter;
    const hay=[
      item.purchase_code,item.course_title,item.learner_name,item.howdi_id,item.email,item.phone,
      item.payment_status,item.purchase_status,item.integrity_state,item.transaction_code
    ].filter(Boolean).join(' ').toLowerCase();
    return filterOk&&(!q||hay.includes(q));
  });

  const paymentRecords = useMemo(() => {
    if(paymentTransactions.length)return paymentTransactions;
    return orders.map(order => ({
      id: order.paymentId || `PAY-${order.orderNumber || order.id || 'UNKNOWN'}`,
      orderId: order.id,
      orderNumber: order.orderNumber || order.id || '—',
      customerName: order.customerName || 'Customer',
      howdiId: order.howdiId || '',
      amount: Number(order.total || 0),
      method: order.paymentMethod || 'Pending',
      status: String(order.paymentStatus || (order.status==='pending'?'pending':'paid')).toLowerCase(),
      createdAt: order.paymentAt || order.createdAt || Date.now(),
      reference: order.paymentReference || 'Awaiting gateway reference',
      provider:'HOWDI',
      source:'ORDER_COMPATIBILITY',
      events:[],
      rawOrder: order
    }));
  }, [paymentTransactions,orders]);
  const filteredPayments = paymentRecords.filter(payment => {
    const q=paymentSearch.trim().toLowerCase();
    const statusOk=paymentStatusFilter==='all' || payment.status===paymentStatusFilter;
    const hay=[payment.id,payment.orderNumber,payment.customerName,payment.howdiId,payment.method,payment.reference].filter(Boolean).join(' ').toLowerCase();
    return statusOk && (!q || hay.includes(q));
  });
  const paymentStats = {
    total: paymentRecords.reduce((sum,p)=>sum+p.amount,0),
    paid: paymentRecords.filter(p=>p.status==='paid').reduce((sum,p)=>sum+p.amount,0),
    pending: paymentRecords.filter(p=>['pending','initiated','processing'].includes(p.status)).reduce((sum,p)=>sum+p.amount,0),
    refunded: paymentRecords.filter(p=>['refunded','refund_pending'].includes(p.status)).reduce((sum,p)=>sum+p.amount,0)
  };
  async function updatePaymentStatus(payment, nextStatus){
    if(payment.dbId){
      try{
        await api(`/api/admin/payments/transactions/${payment.dbId}/status`,{
          method:'PUT',
          body:JSON.stringify({status:nextStatus,actor:'ADMIN'})
        });
        setSelectedPayment({...payment,status:nextStatus});
        setNotice(`Payment ${nextStatus.replace('_',' ')} successfully updated in the PostgreSQL transaction ledger.`);
        await loadPaymentTransactions();
        await loadOrders();
        return;
      }catch(error){
        setNotice(`Payment update failed: ${error.message}`);
        return;
      }
    }
    if(!payment.orderId){ setNotice('This payment is not linked to an order record.'); return; }
    const next=orders.map(order=>String(order.id)===String(payment.orderId)?{...order,paymentStatus:nextStatus,paymentUpdatedAt:new Date().toISOString()}:order);
    persistOrders(next);
    setSelectedPayment({...payment,status:nextStatus});
    setNotice(`Payment ${nextStatus.replace('_',' ')} updated in compatibility mode.`);
  }

  function persistWorks(nextWorks){setWorks(nextWorks);}
  function resetWorkForm(){
    setWorkForm({title:'',category:workServices.find(s=>s.active!==false)?.name||'',workType:'one_time',city:'',pincode:'',budget:'',scheduleDate:'',description:'',skills:'',status:'open',priority:'normal',active:true});
    setEditingWork(null);
  }
  async function saveWork(e){
    e.preventDefault();
    const title=workForm.title.trim(),city=workForm.city.trim();
    if(!title||!city){setNotice('Work title and city are required.');return;}
    if(!workForm.category){setNotice('Select a Works service.');return;}
    if(workForm.pincode&&!/^\d{6}$/.test(String(workForm.pincode).trim())){setNotice('Enter a valid 6-digit pincode or leave it blank.');return;}
    try{
      const payload={...workForm,title,city,pincode:String(workForm.pincode||'').trim(),budget:Number(workForm.budget||0)};
      const result=await api(editingWork?`/api/admin/works/work-orders/${editingWork.id}`:'/api/admin/works/work-orders',{method:editingWork?'PUT':'POST',body:JSON.stringify(payload)});
      await loadWorksLive();setSelectedWork(result.workOrder||null);resetWorkForm();setNotice(editingWork?'Work request updated in PostgreSQL.':'Work request created in PostgreSQL.');
    }catch(error){setNotice(`Work request save failed: ${error.message}`);}
  }
  function editWork(item){
    setEditingWork(item);
    setWorkForm({title:item.title||'',category:item.category||workServices.find(s=>s.active!==false)?.name||'',workType:item.workType||'one_time',city:item.city||'',pincode:item.pincode||'',budget:String(item.budget??''),scheduleDate:item.scheduleDate||'',description:item.description||'',skills:item.skills||'',status:item.status||'open',priority:item.priority||'normal',active:item.active!==false});
    window.scrollTo({top:0,behavior:'smooth'});
  }
  async function updateWorkStatus(item,status){
    try{const result=await api(`/api/admin/works/work-orders/${item.id}/status`,{method:'PUT',body:JSON.stringify({status})});await loadWorksLive();setSelectedWork(result.workOrder);setNotice(`${item.workCode||item.id} moved to ${status.replaceAll('_',' ')}.`);}catch(error){setNotice(`Work status update failed: ${error.message}`);}
  }
  async function deleteWork(item){
    if(!window.confirm(`Delete work request "${item.title}"?`))return;
    try{await api(`/api/admin/works/work-orders/${item.id}`,{method:'DELETE'});await loadWorksLive();if(selectedWork?.id===item.id)setSelectedWork(null);if(editingWork?.id===item.id)resetWorkForm();setNotice('Work request deleted.');}catch(error){setNotice(`Delete failed: ${error.message}`);}
  }
  const filteredWorks=works.filter(item=>{const q=workSearch.trim().toLowerCase();const statusOk=workStatusFilter==='all'||item.status===workStatusFilter;const hay=[item.workCode,item.id,item.title,item.category,item.workType,item.city,item.pincode,item.skills,item.description].filter(Boolean).join(' ').toLowerCase();return statusOk&&(!q||hay.includes(q));});
  const workStats={total:works.length,open:works.filter(x=>x.status==='open').length,assigned:works.filter(x=>['offered','assigned'].includes(x.status)).length,completed:works.filter(x=>x.status==='completed').length};

  function persistWorkers(next){setWorkers(next);localStorage.setItem('howdiAdminWorkers',JSON.stringify(next));}
  function resetWorkerForm(){setWorkerForm({ fullName:'', phone:'', email:'', city:'', pincode:'', requestedSkill:'Electrician', experienceYears:'', serviceRadiusKm:'8', startingPrice:'399', kycStatus:'pending', skillStatus:'pending', accountStatus:'registered', availability:'offline', rating:'0', completedJobs:'0', active:true });setEditingWorker(null);}
  async function saveWorker(e){
    e.preventDefault();const fullName=workerForm.fullName.trim(),phone=workerForm.phone.trim();
    if(!fullName||!phone){setNotice('Worker name and phone are required.');return;}
    try{const payload={...workerForm,fullName,phone,experienceYears:Number(workerForm.experienceYears||0),serviceRadiusKm:Number(workerForm.serviceRadiusKm||0),startingPrice:Number(workerForm.startingPrice||0),rating:Number(workerForm.rating||0),completedJobs:Number(workerForm.completedJobs||0)};
      await api(editingWorker?`/api/admin/works/workers/${editingWorker.id}`:'/api/admin/works/workers',{method:editingWorker?'PUT':'POST',body:JSON.stringify(payload)});
      await loadWorksLive();resetWorkerForm();setNotice(editingWorker?'Worker updated in PostgreSQL.':'Worker created in PostgreSQL.');
    }catch(error){setNotice(`Worker save failed: ${error.message}`);}
  }
  function editWorker(item){setEditingWorker(item);setWorkerForm({fullName:item.fullName||'',phone:item.phone||'',email:item.email||'',city:item.city||'',pincode:item.pincode||'',requestedSkill:item.requestedSkill||(mappedServices(item.id).find(s=>workerServiceMappings.some(m=>m.workerId===item.id&&m.serviceId===s.id&&m.primary))?.name || item.requestedSkill || 'Unmapped')||'Electrician',experienceYears:String(item.experienceYears??''),serviceRadiusKm:String(item.serviceRadiusKm??'8'),startingPrice:String(item.startingPrice??'399'),kycStatus:item.kycStatus||'pending',skillStatus:item.skillStatus||'pending',accountStatus:item.accountStatus||'registered',availability:item.availability||'offline',rating:String(item.rating??'0'),completedJobs:String(item.completedJobs??'0'),active:item.active!==false});setWorksSection('workers');window.scrollTo({top:0,behavior:'smooth'});}
  async function updateWorkerStatus(item,key,value){try{const result=await api(`/api/admin/works/workers/${item.id}/status`,{method:'PUT',body:JSON.stringify({key,value})});await loadWorksLive();setSelectedWorker(result.worker);setNotice(`${item.fullName}: ${key} updated in PostgreSQL.`);}catch(error){setNotice(`Worker update failed: ${error.message}`);}}
  async function deleteWorker(item){if(!window.confirm(`Delete worker "${item.fullName}"?`))return;try{await api(`/api/admin/works/workers/${item.id}`,{method:'DELETE'});await loadWorksLive();setSelectedWorker(null);setNotice('Worker removed.');}catch(error){setNotice(`Delete failed: ${error.message}`);}}

  const filteredWorkers=workers.filter(item=>{const q=workerSearch.trim().toLowerCase();const statusOk=workerStatusFilter==='all'||item.accountStatus===workerStatusFilter||item.kycStatus===workerStatusFilter||item.skillStatus===workerStatusFilter;const hay=[item.id,item.workerCode,item.fullName,item.phone,item.email,item.city,item.pincode,(mappedServices(item.id).find(s=>workerServiceMappings.some(m=>m.workerId===item.id&&m.serviceId===s.id&&m.primary))?.name || item.requestedSkill || 'Unmapped'),item.kycStatus,item.skillStatus,item.accountStatus,item.availability].filter(Boolean).join(' ').toLowerCase();return statusOk&&(!q||hay.includes(q));});
  const workerStats={total:workers.length,kycPending:workers.filter(x=>x.kycStatus!=='verified').length,verified:workers.filter(x=>x.kycStatus==='verified'&&x.skillStatus==='verified').length,active:workers.filter(x=>x.accountStatus==='active').length,online:workers.filter(x=>x.availability==='online').length};

  function persistServices(next){setWorkServices(next);}
  function resetServiceForm(){setServiceForm({name:'',icon:'🛠️',description:'',visible:true,active:true,sortOrder:''});setEditingService(null);}
  async function saveService(e){e.preventDefault();const name=serviceForm.name.trim();if(!name){setNotice('Service name is required.');return;}try{await api(editingService?`/api/admin/works/services/${editingService.id}`:'/api/admin/works/services',{method:editingService?'PUT':'POST',body:JSON.stringify({...serviceForm,name,sortOrder:Number(serviceForm.sortOrder||workServices.length+1)})});await loadWorksLive();resetServiceForm();setNotice(editingService?'Service updated.':'New service is now in PostgreSQL.');}catch(error){setNotice(`Service save failed: ${error.message}`);}}
  function editService(item){setEditingService(item);setServiceForm({name:item.name||'',icon:item.icon||'🛠️',description:item.description||'',visible:item.visible!==false,active:item.active!==false,sortOrder:String(item.sortOrder??'')});}
  async function toggleService(item,key){try{await api(`/api/admin/works/services/${item.id}`,{method:'PUT',body:JSON.stringify({...item,[key]:!item[key]})});await loadWorksLive();}catch(error){setNotice(`Service update failed: ${error.message}`);}}
  async function deleteService(item){if(!window.confirm(`Delete Works service "${item.name}"?`))return;try{await api(`/api/admin/works/services/${item.id}`,{method:'DELETE'});await loadWorksLive();setNotice('Service deleted.');}catch(error){setNotice(`Delete failed: ${error.message}`);}}

  function persistWorkerServiceMappings(next){setWorkerServiceMappings(next);}
  async function toggleWorkerService(workerId,serviceId){const existing=workerServiceMappings.find(x=>String(x.workerId)===String(workerId)&&String(x.serviceId)===String(serviceId));try{if(existing)await api(`/api/admin/works/mappings/${existing.id}`,{method:'DELETE'});else await api('/api/admin/works/mappings',{method:'POST',body:JSON.stringify({workerId,serviceId})});await loadWorksLive();setNotice(existing?'Service mapping removed.':'Service approved for worker.');}catch(error){setNotice(`Mapping failed: ${error.message}`);}}
  async function makePrimaryWorkerService(workerId,serviceId){const existing=workerServiceMappings.find(x=>String(x.workerId)===String(workerId)&&String(x.serviceId)===String(serviceId));if(!existing){setNotice('Approve this service first.');return;}try{await api(`/api/admin/works/mappings/${existing.id}/primary`,{method:'PUT',body:'{}'});await loadWorksLive();setNotice('Primary Service updated.');}catch(error){setNotice(`Primary update failed: ${error.message}`);}}

  function mappedServices(workerId){return workServices.filter(s=>workerServiceMappings.some(m=>String(m.workerId)===String(workerId)&&String(m.serviceId)===String(s.id)&&m.status==='approved'));}
  function primaryServiceFor(workerId){
    const mapping=workerServiceMappings.find(m=>String(m.workerId)===String(workerId)&&m.primary&&m.status==='approved');
    return workServices.find(s=>String(s.id)===String(mapping?.serviceId))||null;
  }

  function addWorkerDocument(workerId,type='ID Proof'){
    const worker=workers.find(x=>x.id===workerId);if(!worker)return;
    const item={id:`DOC-${Date.now().toString().slice(-8)}`,workerId,type,fileName:`${type.replaceAll(' ','_').toLowerCase()}_received.pdf`,status:'received',receivedAt:new Date().toISOString(),reviewedAt:null,reviewer:'',remarks:''};
    const next=[item,...workerDocuments];setWorkerDocuments(next);localStorage.setItem('howdiWorkerDocuments',JSON.stringify(next));setNotice(`${type} marked received for ${worker.fullName}.`);
  }
  function reviewWorkerDocument(doc,status){
    const next=workerDocuments.map(x=>x.id===doc.id?{...x,status,reviewedAt:new Date().toISOString(),reviewer:'Admin'}:x);setWorkerDocuments(next);localStorage.setItem('howdiWorkerDocuments',JSON.stringify(next));setNotice(`Document ${status}.`);
  }

  function eligibleWorkersForWork(work){
    return workers.filter(w=>
      w.accountStatus==='active' &&
      w.kycStatus==='verified' &&
      w.skillStatus==='verified' &&
      mappedServices(w.id).some(s=>s.name===work?.category)
    );
  }
  async function sendWorkOffer(work,worker){
    if(!work||!worker)return;
    const existing=workAssignments.some(x=>String(x.workId)===String(work.id)&&String(x.workerId)===String(worker.id)&&['offered','accepted'].includes(x.status));
    if(existing){setNotice('This work is already offered to the selected worker.');return;}
    try{await api('/api/admin/works/offers',{method:'POST',body:JSON.stringify({workId:work.id,workerId:worker.id})});await loadWorksLive();setNotice(`Work offer sent to ${worker.fullName}.`);}catch(error){setNotice(`Offer failed: ${error.message}`);}
  }
  async function updateJourneyStage(item,stage){
    try{await api(`/api/admin/works/work-orders/${item.workId}/journey/stage`,{method:'PUT',body:JSON.stringify({stage})});await loadWorksLive();setNotice(`Job moved to ${stage.replaceAll('_',' ')}.`);}catch(error){setNotice(`Journey update failed: ${error.message}`);}
  }
  async function verifyJourneyPin(item){
    const pin=String(journeyPinInput[item.workId]||'').trim();
    if(!pin){setNotice('Enter the customer Job PIN first.');return;}
    try{await api(`/api/admin/works/work-orders/${item.workId}/journey/verify-pin`,{method:'POST',body:JSON.stringify({pin})});setJourneyPinInput(prev=>({...prev,[item.workId]:''}));await loadWorksLive();setNotice('Job PIN verified. Work can now start.');}catch(error){setNotice(`PIN verification failed: ${error.message}`);}
  }
  async function updateAssignment(item,status){
    try{await api(`/api/admin/works/offers/${item.id}/status`,{method:'PUT',body:JSON.stringify({status})});await loadWorksLive();setNotice(`Offer ${status}.`);}catch(error){setNotice(`Offer update failed: ${error.message}`);}
  }

  function createSafetyIncident(party,work,worker,reason){
    const item={id:`SOS-${Date.now().toString().slice(-8)}`,party,workId:work?.id||'',workerId:worker?.id||'',reason,status:'open',severity:'critical',createdAt:new Date().toISOString(),lastLocation:work?.city?`${work.city}${work.pincode?` ${work.pincode}`:''}`:'Location unavailable',assignedTo:'Safety Queue'};
    const next=[item,...safetyIncidents];setSafetyIncidents(next);localStorage.setItem('howdiSafetyIncidents',JSON.stringify(next));setNotice(`Critical safety incident ${item.id} created.`);
  }
  function updateSafetyIncident(item,status){const next=safetyIncidents.map(x=>x.id===item.id?{...x,status,updatedAt:new Date().toISOString()}:x);setSafetyIncidents(next);localStorage.setItem('howdiSafetyIncidents',JSON.stringify(next));}

  const worksAudit = [
    ...workAssignments.map(x=>({id:x.id,type:'Work offer',when:x.offeredAt,detail:`${x.workId} → ${workers.find(w=>w.id===x.workerId)?.fullName||x.workerId} · ${x.status}`})),
    ...safetyIncidents.map(x=>({id:x.id,type:'Safety incident',when:x.createdAt,detail:`${x.party} · ${x.reason} · ${x.status}`})),
    ...workerDocuments.map(x=>({id:x.id,type:'KYC document',when:x.reviewedAt||x.receivedAt,detail:`${workers.find(w=>w.id===x.workerId)?.fullName||x.workerId} · ${x.type} · ${x.status}`}))
  ].sort((a,b)=>new Date(b.when||0)-new Date(a.when||0)).slice(0,40);

  async function loadWorksBookings(){
    setWorksBookingsLoading(true);
    try{
      const data=await api('/api/admin/works/bookings');
      setWorksBookings(Array.isArray(data.bookings)?data.bookings:[]);
    }catch(error){setNotice(`Works bookings: ${error.message}`);}
    finally{setWorksBookingsLoading(false);}
  }
  async function openWorksBooking(item){
    setSelectedWorksBooking(item);setSelectedWorksBookingDetail(null);
    try{
      const data=await api(`/api/admin/works/bookings/${encodeURIComponent(item.workCode)}`);
      setSelectedWorksBookingDetail(data);
    }catch(error){setNotice(`Works booking detail: ${error.message}`);}
  }
  const worksBookingStats={
    total:worksBookings.length,
    active:worksBookings.filter(x=>!['rejected','cancelled','completed','customer_confirmed','closed'].includes(String(x.status||'').toLowerCase())).length,
    completed:worksBookings.filter(x=>['completed','customer_confirmed','closed'].includes(String(x.status||'').toLowerCase())).length,
    openCases:worksBookings.reduce((sum,x)=>sum+Number(x.openCaseCount||0),0)
  };
  const filteredWorksBookings=worksBookings.filter(item=>{
    const q=worksBookingSearch.trim().toLowerCase();
    const status=String(item.status||'').toLowerCase();
    const openCases=Number(item.openCaseCount||0);
    const filterOk=worksBookingFilter==='all'
      ||(worksBookingFilter==='active'&&!['rejected','cancelled','completed','customer_confirmed','closed'].includes(status))
      ||(worksBookingFilter==='completed'&&['completed','customer_confirmed','closed'].includes(status))
      ||(worksBookingFilter==='cases'&&openCases>0)
      ||status===worksBookingFilter;
    const hay=[item.workCode,item.serviceName,item.customer?.name,item.customer?.phone,item.worker?.name,item.worker?.workerCode,item.city,item.pincode,item.payment?.status].filter(Boolean).join(' ').toLowerCase();
    return filterOk&&(!q||hay.includes(q));
  });

  async function loadWorksLive(){
    try{
      const [s,w,m,o,f,a,wa,live]=await Promise.all([
        api('/api/admin/works/services'),
        api('/api/admin/works/workers'),
        api('/api/admin/works/mappings'),
        api('/api/admin/works/work-orders'),
        api('/api/admin/works/offers'),
        api('/api/admin/works/applications'),
        api('/api/admin/works/whatsapp-assist'),
        api('/api/admin/works/live-operations')
      ]);
      setWorkServices(Array.isArray(s.services)?s.services:[]);
      setWorkers(Array.isArray(w.workers)?w.workers:[]);
      setWorkerServiceMappings(Array.isArray(m.mappings)?m.mappings:[]);
      setWorks(Array.isArray(o.workOrders)?o.workOrders:[]);
      setWorkAssignments(Array.isArray(f.offers)?f.offers:[]);
      setWorkerApplications(Array.isArray(a.applications)?a.applications:[]);
      setWhatsappWorkerLeads(Array.isArray(wa.leads)?wa.leads:[]);
      setLiveJourneys(Array.isArray(live.journeys)?live.journeys:[]);
    }catch(error){setNotice(`Works backend: ${error.message}`);}
  }
  useEffect(()=>{if(tab==='works'){loadWorksLive();loadWorksBookings();}},[tab]);

  async function loadVendorsLive(){try{const [v,a]=await Promise.all([api('/api/admin/vendors'),api('/api/admin/vendors/applications')]);setVendors(Array.isArray(v.vendors)?v.vendors:[]);setVendorApplications(Array.isArray(a.applications)?a.applications:[]);}catch(error){setNotice(`Vendor backend: ${error.message}`);}}
  useEffect(()=>{if(tab==='vendors')loadVendorsLive();},[tab]);
  useEffect(()=>{if(tab==='orders')loadOrdersLive();},[tab]);
  async function reviewWorkerApplication(item,status){try{await api(`/api/admin/works/applications/${item.id}/status`,{method:'PUT',body:JSON.stringify({status})});await loadWorksLive();setNotice(status==='approved'?'Worker application approved. Worker record created; continue KYC, skill verification and mapping.':`Worker application ${status.replaceAll('_',' ')}.`);}catch(error){setNotice(`Worker application failed: ${error.message}`);}}
  async function reviewVendorApplication(item,status){try{await api(`/api/admin/vendors/applications/${item.id}/status`,{method:'PUT',body:JSON.stringify({status})});await loadVendorsLive();setNotice(status==='approved'?'Vendor application approved. Vendor record created; continue KYC, payout and catalogue approval.':`Vendor application ${status.replaceAll('_',' ')}.`);}catch(error){setNotice(`Vendor application failed: ${error.message}`);}}

  async function updateWhatsappWorkerLead(item,status){try{await api(`/api/admin/works/whatsapp-assist/${item.id}/status`,{method:'PUT',body:JSON.stringify({status})});await loadWorksLive();setNotice(`WhatsApp assist lead ${status}.`);}catch(error){setNotice(`WhatsApp lead update failed: ${error.message}`);}}
  function persistVendors(nextVendors){setVendors(nextVendors);}
  function resetVendorForm(){setVendorForm({ businessName:'', ownerName:'', phone:'', email:'', businessType:'Individual Creator', city:'', state:'', pincode:'', gstin:'', pan:'', category:'Crochet & Handmade', kycStatus:'pending', payoutStatus:'not_connected', status:'pending', catalogueAccess:false, active:true });setEditingVendor(null);}
  async function saveVendor(e){e.preventDefault();const businessName=vendorForm.businessName.trim(),ownerName=vendorForm.ownerName.trim(),phone=vendorForm.phone.trim();if(!businessName||!ownerName||!phone){setNotice('Business name, owner name and phone are required.');return;}try{const result=await api(editingVendor?`/api/admin/vendors/${editingVendor.id}`:'/api/admin/vendors',{method:editingVendor?'PUT':'POST',body:JSON.stringify({...vendorForm,businessName,ownerName,phone})});await loadVendorsLive();setSelectedVendor(result.vendor||null);resetVendorForm();setNotice(editingVendor?'Vendor updated in PostgreSQL.':'Vendor record created in PostgreSQL.');}catch(error){setNotice(`Vendor save failed: ${error.message}`);}}
  function editVendor(item){setEditingVendor(item);setVendorForm({businessName:item.businessName||'',ownerName:item.ownerName||'',phone:item.phone||'',email:item.email||'',businessType:item.businessType||'Individual Creator',city:item.city||'',state:item.state||'',pincode:item.pincode||'',gstin:item.gstin||'',pan:item.pan||'',category:item.category||'Crochet & Handmade',kycStatus:item.kycStatus||'pending',payoutStatus:item.payoutStatus||'not_connected',status:item.status||'pending',catalogueAccess:!!item.catalogueAccess,active:item.active!==false});window.scrollTo({top:0,behavior:'smooth'});}
  async function updateVendorStatus(item,status){try{const result=await api(`/api/admin/vendors/${item.id}`,{method:'PUT',body:JSON.stringify({...item,status})});await loadVendorsLive();setSelectedVendor(result.vendor);setNotice(`${item.businessName} is now ${status.replaceAll('_',' ')}.`);}catch(error){setNotice(`Vendor status failed: ${error.message}`);}}
  async function toggleVendorCatalogue(item){try{const result=await api(`/api/admin/vendors/${item.id}`,{method:'PUT',body:JSON.stringify({...item,catalogueAccess:!item.catalogueAccess})});await loadVendorsLive();setSelectedVendor(result.vendor);setNotice(`${item.businessName} catalogue access ${result.vendor.catalogueAccess?'enabled':'disabled'}.`);}catch(error){setNotice(`Catalogue update failed: ${error.message}`);}}
  async function deleteVendor(item){if(!window.confirm(`Delete vendor "${item.businessName}"?`))return;try{await api(`/api/admin/vendors/${item.id}`,{method:'DELETE'});await loadVendorsLive();if(selectedVendor?.id===item.id)setSelectedVendor(null);setNotice('Vendor deleted.');}catch(error){setNotice(`Delete failed: ${error.message}`);}}

  const filteredVendors=vendors.filter(item=>{const q=vendorSearch.trim().toLowerCase();const statusOk=vendorStatusFilter==='all'||item.status===vendorStatusFilter;const hay=[item.id,item.vendorCode,item.businessName,item.ownerName,item.phone,item.email,item.businessType,item.category,item.city,item.state,item.gstin,item.pan].filter(Boolean).join(' ').toLowerCase();return statusOk&&(!q||hay.includes(q));});
  const vendorStats={total:vendors.length,pending:vendors.filter(x=>x.status==='pending').length,active:vendors.filter(x=>x.status==='active').length,blocked:vendors.filter(x=>['suspended','blocked','rejected'].includes(x.status)).length};

  function updatePlatformSetting(key, value) {
    const next = { ...platformSettings, [key]: value };
    setPlatformSettings(next);
    localStorage.setItem('howdiPlatformSettings', JSON.stringify(next));
    setNotice('Platform setting updated');
    setTimeout(() => setNotice(''), 2200);
  }

  function persistNotifications(next) {
    setNotifications(next);
    localStorage.setItem('howdiAdminNotifications', JSON.stringify(next));
  }

  function createNotification(e) {
    e.preventDefault();
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      setNotice('Please add a notification title and message.');
      return;
    }
    const item = {
      id: `NTF-${Date.now().toString().slice(-8)}`,
      ...notificationForm,
      title: notificationForm.title.trim(),
      message: notificationForm.message.trim(),
      status: notificationForm.schedule === 'now' ? 'sent' : 'scheduled',
      createdAt: new Date().toISOString()
    };
    persistNotifications([item, ...notifications]);
    setNotificationForm({ title:'', message:'', audience:'all_customers', channel:'in_app', type:'system', schedule:'now' });
    setNotice(item.status === 'sent' ? 'Notification created and queued as sent.' : 'Notification saved as scheduled.');
  }

  function updateNotificationStatus(item, status) {
    persistNotifications(notifications.map(n => n.id === item.id ? { ...n, status } : n));
    setNotice(`Notification marked ${status}.`);
  }

  const filteredNotifications = notifications.filter(n => {
    const q = notificationSearch.trim().toLowerCase();
    const matchesQuery = !q || [n.id,n.title,n.message,n.audience,n.channel,n.type].join(' ').toLowerCase().includes(q);
    const matchesFilter = notificationFilter === 'all' || n.status === notificationFilter;
    return matchesQuery && matchesFilter;
  });

  const notificationStats = {
    total: notifications.length,
    sent: notifications.filter(n => n.status === 'sent').length,
    scheduled: notifications.filter(n => n.status === 'scheduled').length,
    draft: notifications.filter(n => n.status === 'draft').length
  };

  const filteredProducts = products.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [p.name, p.brand, p.subcategory, categoryName(p.categoryId)].filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  function persistReports(next) {
    setReports(next);
    localStorage.setItem('howdiAdminReports', JSON.stringify(next));
  }

  function createReport(e) {
    e.preventDefault();
    if (!reportForm.reporter.trim() || !reportForm.target.trim() || !reportForm.reason.trim()) {
      setNotice('Add reporter, target and reason before saving a report.');
      return;
    }
    const item = {
      id: `RPT-${Date.now().toString().slice(-7)}`,
      reporter: reportForm.reporter.trim(),
      target: reportForm.target.trim(),
      targetType: reportForm.targetType,
      reason: reportForm.reason.trim(),
      details: reportForm.details.trim(),
      status: 'open',
      action: 'pending',
      createdAt: new Date().toISOString()
    };
    persistReports([item, ...reports]);
    setReportForm({ reporter:'', target:'', targetType:'user', reason:'', details:'' });
    setSelectedReport(item);
    setNotice('Safety report added to moderation queue.');
  }

  function updateReport(next) {
    persistReports(reports.map(r => r.id === next.id ? next : r));
    setSelectedReport(next);
  }

  const filteredReports = reports.filter(r => {
    const q = reportSearch.toLowerCase().trim();
    const matchStatus = reportStatusFilter === 'all' || r.status === reportStatusFilter;
    const hay = `${r.id} ${r.reporter} ${r.target} ${r.targetType} ${r.reason} ${r.details}`.toLowerCase();
    return matchStatus && (!q || hay.includes(q));
  });
  const moderationStats = {
    total: reports.length,
    open: reports.filter(r=>r.status==='open').length,
    reviewing: reports.filter(r=>r.status==='reviewing').length,
    resolved: reports.filter(r=>r.status==='resolved').length
  };

  if (!token) return (
    <div className="login-page">
      <form className="login-card" onSubmit={login}>
        <div className="brand large"><i className="howdi-admin-mark">H</i><span>HOWDI</span><small>ADMIN</small></div>
        <div className="eyebrow">CROCHET GRANDMA · CONTROL TOWER</div>
        <h1>Welcome back.</h1>
        <p>One calm place to run the catalogue, today’s business and tomorrow’s expansion.</p>
        <label>Username<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></label>
        {loginError&&<div className="error">{loginError}</div>}
        <button className="primary full-btn">Sign in</button>
      </form>
    </div>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><i className="howdi-admin-mark">H</i><span>HOWDI</span><small>ADMIN</small></div>
        <div className="tagline">Crochet Grandma · Control Tower</div>
        <div className="workspace-chip"><span className="dot"/> Production foundation <b>TEST</b></div>
        <nav>
          {NAV.map(([id,icon,label])=>(
            <button className={tab===id?'active':''} onClick={()=>{setTab(id);setSearch('')}} key={id}>
              <span className="nav-icon">{icon}</span><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="future-note"><span>🧭</span><div><b>Built for tomorrow</b><small>Expansion slots are reserved.</small></div></div>
          <button className="logout" onClick={()=>{localStorage.removeItem('howdiAdminToken');setToken('')}}>Sign out</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <div className="eyebrow">HOWDI.SHOP ADMIN</div>
            <h1>{tab==='dashboard'?'Control Tower':tab==='users'?'Identity & Access Management':tab==='categories'?'Categories':tab==='subcategories'?'Subcategories':tab==='products'?'Products':tab==='variants'?'Variants & Stock':tab==='locations'?'Locations & Delivery':tab==='inventory'?'Inventory Movement & History':tab==='orders'?'Orders & Fulfilment':tab==='logistics'?'Logistics Control Center':tab==='payments'?'Payments & Transactions':tab==='hpay'?'HPay Control Tower':tab==='notifications'?'Notifications & Communication':tab==='moderation'?'Connect Safety & Moderation':tab==='settings'?'Platform Settings & Admin Control':tab==='coupons'?'Coupons & Promo Codes':tab==='works'?'Works & Service Operations':tab==='move'?'Move Operations':tab==='vendors'?'Vendor Network':'Future Dashboard Lab'}</h1>
            <p>{tab==='dashboard'?'See what needs attention now — and what HOWDI can become next.':tab==='users'?'Manage HOWDI identity, master records, account types, lifecycle status and access foundations in one place.':tab==='future'?'Reserved capacity for ideas, branches, countries and future businesses.':tab==='locations'?'Control customer serviceability and delivery rules by pincode.':tab==='orders'?'Monitor every order from confirmation to delivery, cancellation and return.':tab==='hpay'?'Monitor HPay money movement, requests, QR/UPI activity, risk, limits and payment identities.':tab==='moderation'?'Review reports, protect customers and prepare HOWDI Connect for safe growth.':tab==='settings'?'Control platform access, feature readiness and operational safeguards from one place.':tab==='coupons'?'Create unique promo codes and prepare future campaign rules without disturbing the catalogue.':tab==='works'?'Create, review and manage local work opportunities, service requests and fulfilment status.':tab==='move'?'Verify drivers, control dispatch, enforce safety gates and resolve Move incidents.':tab==='vendors'?'Onboard creators and sellers, review compliance and control catalogue access.':'Catalogue controls are the source of truth for customer discovery.'}</p>
          </div>
          <div className="top-actions">
            <span className="live-pill"><span className="dot"/> Admin connected</span>
            <button className="refresh" onClick={loadAll}>↻ Refresh</button>
          </div>
        </header>

        {notice&&<div className="notice">{notice}<button onClick={()=>setNotice('')}>×</button></div>}

        {tab==='dashboard' && (
          <div className="page admin-overview">
            <section className="admin-hero">
              <div className="admin-hero-copy">
                <span className="admin-eyebrow">🌿 HOWDI CONTROL CENTER</span>
                <h2>Good morning, Admin 👋</h2>
                <p>One calm place to guide today’s Crochet launch and prepare HOWDI for everything that comes next.</p>
                <div className="admin-hero-actions">
                  <button className="primary admin-primary" onClick={()=>setTab('products')}>Open Crochet Hub <span>→</span></button>
                  <button className="admin-ghost" onClick={()=>setTab('users')}>Manage People</button>
                </div>
              </div>
              <div className="admin-hero-orbit" aria-hidden="true">
                <div className="orbit-center"><span>🧶</span><b>HOWDI</b><small>launch mode</small></div>
                <span className="orbit-pill one">👥 People</span>
                <span className="orbit-pill two">📦 Orders</span>
                <span className="orbit-pill three">🎨 Creators</span>
                <span className="orbit-pill four">💰 Growth</span>
              </div>
            </section>

            <section className="admin-kpi-grid">
              <button className="admin-kpi" onClick={()=>setTab('products')}><span className="kpi-icon crochet">🧶</span><div><small>Active Crochet Products</small><strong>{visibleProducts}</strong><em>{products.length} total in catalogue</em></div><b>↗</b></button>
              <button className="admin-kpi" onClick={()=>setTab('users')}><span className="kpi-icon people">👥</span><div><small>HOWDI Community</small><strong>{userStats.total}</strong><em>{userStats.active} active accounts</em></div><b>↗</b></button>
              <button className="admin-kpi" onClick={()=>setTab('orders')}><span className="kpi-icon orders">📦</span><div><small>Orders in Control</small><strong>{orders.length}</strong><em>{orders.filter(o=>!['delivered','cancelled','returned','refunded'].includes(o.status)).length} need tracking</em></div><b>↗</b></button>
              <button className="admin-kpi attention" onClick={()=>setTab('variants')}><span className="kpi-icon alert">✨</span><div><small>Needs Attention</small><strong>{lowStock}</strong><em>{lowStock ? 'Review low-stock items' : 'Everything looks healthy'}</em></div><b>→</b></button>
            </section>

            <section className="crochet-command">
              <div className="section-heading admin-section-heading">
                <div><span className="admin-eyebrow">🧶 PHASE 1 · CROCHET MARKETPLACE</span><h2>Your launch command center</h2><p>Build the first HOWDI marketplace around handmade crochet, creators and thoughtful product discovery.</p></div>
                <span className="launch-badge"><i/> CROCHET FIRST</span>
              </div>
              <div className="crochet-command-grid">
                <button className="command-card featured-command" onClick={()=>setTab('products')}><span className="command-art">🧶</span><div><small>PRODUCT STUDIO</small><h3>Manage handmade products</h3><p>Add, edit, feature and control what customers discover.</p><strong>Open Products →</strong></div></button>
                <button className="command-card" onClick={()=>setTab('categories')}><span>🎨</span><div><h3>Categories</h3><p>{categories.length} foundations</p></div></button>
                <button className="command-card" onClick={()=>setTab('variants')}><span>📏</span><div><h3>Variants & Stock</h3><p>{variants.length} tracked</p></div></button>
                <button className="command-card" onClick={()=>setTab('orders')}><span>🧾</span><div><h3>Orders</h3><p>{orders.length} in workspace</p></div></button>
              </div>
            </section>

            <div className="admin-workspace-grid">
              <section className="admin-panel activity-panel">
                <div className="admin-panel-head"><div><span className="admin-eyebrow">TODAY'S PULSE</span><h3>What needs your attention?</h3></div><button onClick={loadAll}>↻ Refresh</button></div>
                <div className="pulse-list">
                  <button onClick={()=>setTab('users')}><span className="pulse-dot green"/><div><strong>Community identity</strong><small>{userStats.active} active HOWDI accounts ready to engage</small></div><em>Open →</em></button>
                  <button onClick={()=>setTab('products')}><span className="pulse-dot purple"/><div><strong>Marketplace readiness</strong><small>{visibleProducts} visible products available for discovery</small></div><em>Open →</em></button>
                  <button onClick={()=>setTab('variants')}><span className={`pulse-dot ${lowStock?'gold':'green'}`}/><div><strong>Inventory health</strong><small>{lowStock ? `${lowStock} item${lowStock===1?'':'s'} should be reviewed` : 'No immediate stock flags'}</small></div><em>Review →</em></button>
                  <button onClick={()=>setTab('orders')}><span className="pulse-dot blue"/><div><strong>Order operations</strong><small>{orders.length ? `${orders.length} orders currently in the admin workspace` : 'Ready for the first customer order'}</small></div><em>Open →</em></button>
                </div>
              </section>

              <section className="admin-panel ecosystem-panel">
                <div className="admin-panel-head"><div><span className="admin-eyebrow">HOWDI ROADMAP</span><h3>Grow without rebuilding</h3></div><span className="foundation-chip">FOUNDATION</span></div>
                <div className="ecosystem-flow">
                  <div className="ecosystem-live"><span>🧶</span><div><b>Now</b><strong>Crochet Marketplace</strong><small>Products first</small></div></div>
                  <div className="flow-line"/>
                  <div className="ecosystem-next"><span>👷</span><div><b>Next</b><strong>Workers</strong></div></div>
                  <div className="ecosystem-next"><span>🏪</span><div><b>Then</b><strong>Vendors</strong></div></div>
                  <div className="ecosystem-next"><span>🎓</span><div><b>Grow</b><strong>Learn & Earn</strong></div></div>
                  <div className="ecosystem-next"><span>💬</span><div><b>Connect</b><strong>Social</strong></div></div>
                </div>
              </section>
            </div>

            <section className="admin-bottom-grid">
              <section className="admin-panel readiness-panel">
                <div className="admin-panel-head"><div><span className="admin-eyebrow">LAUNCH CHECKLIST</span><h3>Foundation readiness</h3></div></div>
                <div className="readiness modern-readiness">
                  {[
                    ['Crochet categories', categories.length>0],
                    ['Handmade products', products.length>0],
                    ['Variants & stock', variants.length>0],
                    ['Delivery coverage', locations.length>0],
                    ['Offers & promotions', coupons.length>0],
                  ].map(([name,ok])=><div className="readiness-row" key={name}><span className={ok?'checkmark':'empty'}>{ok?'✓':'○'}</span><span>{name}</span><b>{ok?'Ready':'Next step'}</b></div>)}
                </div>
              </section>
              <section className="admin-panel future-teaser">
                <span className="future-glow">✦</span><span className="admin-eyebrow">BUILT FOR TOMORROW</span><h3>The next HOWDI worlds are already planned.</h3><p>Workers, vendors, learning, earning and community can plug into this foundation when the business is ready.</p><button className="admin-ghost" onClick={()=>setTab('future')}>Explore Future Ecosystem →</button>
              </section>
            </section>
          </div>
        )}

        {tab==='future' && (
          <div className="page">
            <section className="lab-hero"><span className="lab-symbol">✦</span><div><span className="eyebrow">FUTURE DASHBOARD LAB</span><h2>Reserve the desks before we need them.</h2><p>These are intentional extension points — not unfinished promises. We activate them when the real business requires them.</p></div></section>
            <div className="lab-grid">{FUTURE_LAB.map(item=><article className="lab-card" key={item.title}><div className="lab-card-top"><span>{item.icon}</span><em>{item.status}</em></div><h3>{item.title}</h3><p>{item.text}</p><button onClick={()=>setNotice(`${item.title} is reserved for a future phase.`)}>View blueprint →</button></article>)}</div>
          </div>
        )}

        {tab==='users' && (
          <div className="page">
            <section className="welcome-card identity-hero">
              <div>
                <span className="kicker">🛡️ HOWDI IDENTITY & ACCESS</span>
                <h2>One account. One identity foundation. Full lifecycle control.</h2>
                <p>Search and manage HOWDI ID, Master ID, internal identity UUID, account type, role and lifecycle status without changing the customer application.</p>
              </div>
              <button className="primary" onClick={loadUsers}>{usersLoading?'Loading…':'↻ Refresh identities'}</button>
            </section>

            <div className="stats-grid identity-stats">
              <button className="stat-card" onClick={()=>setUserStatusFilter('all')}><span>👥</span><b>{userStats.total}</b><small>Total Accounts</small></button>
              <button className="stat-card" onClick={()=>setUserStatusFilter('ACTIVE')}><span>🟢</span><b>{userStats.active}</b><small>Active</small></button>
              <button className="stat-card" onClick={()=>setUserStatusFilter('SUSPENDED')}><span>⏸️</span><b>{userStats.protected}</b><small>Suspended / Blocked</small></button>
              <button className="stat-card" onClick={()=>setUserStatusFilter('INACTIVE')}><span>🌙</span><b>{userStats.inactive}</b><small>Inactive / Deleted</small></button>
              <button className="stat-card" onClick={()=>setUserStatusFilter('team')}><span>👑</span><b>{userStats.team}</b><small>Admin / Team</small></button>
            </div>

            <section className="panel identity-access-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">IDENTITY DIRECTORY</span>
                  <h2>🛡️ HOWDI Identity & Access</h2>
                  <p>Search by name, email, phone, HOWDI ID, Master ID or internal identity UUID.</p>
                </div>
                <div className="toolbar identity-toolbar">
                  <input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Search identity, HOWDI ID, Master ID…" />
                  <select value={userStatusFilter} onChange={e=>setUserStatusFilter(e.target.value)}>
                    <option value="all">All lifecycle states</option>
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="DELETED">Deleted</option>
                    <option value="team">Admin / Team</option>
                  </select>
                </div>
              </div>

              <div className="identity-list">
                {usersLoading && <div className="empty-state">Loading real HOWDI identity records…</div>}
                {!usersLoading && !filteredUsers.length && <div className="empty-state">No HOWDI identity found for this filter.</div>}

                {filteredUsers.map(user => {
                  const status = getAccountStatus(user);
                  const identityUuid = user.identity_uuid || user.user_identity_uuid || user.id;
                  const accountType = user.account_type_code || user.account_type || user.account_type_name || 'CUSTOMER';

                  return (
                    <article className="identity-row identity-access-row" key={user.id}>
                      <div className="identity-main">
                        <div className="identity-avatar">{String(user.full_name || 'H').slice(0,1).toUpperCase()}</div>
                        <div>
                          <h3>{user.full_name || 'Unnamed HOWDI user'}</h3>
                          <p>{user.email || 'No email'} · {user.phone || 'No phone'}</p>
                          <div className="identity-chips">
                            <button className="id-chip howdi-id" onClick={()=>copyText(user.howdi_id,'HOWDI ID')}>🆔 {user.howdi_id || 'No HOWDI ID'}</button>
                            {user.master_id && <button className="id-chip master-id" onClick={()=>copyText(user.master_id,'Master ID')}>🧬 {user.master_id}</button>}
                            <button className="id-chip uuid-id" onClick={()=>copyText(identityUuid,'Identity UUID')}>🔐 UUID</button>
                          </div>
                        </div>
                      </div>

                      <div className="identity-meta identity-access-meta">
                        <span className="role-pill">{user.role || 'customer'}</span>
                        <span className="account-type-pill">{accountType}</span>
                        <span className={`status-pill lifecycle ${statusClass(status)}`}>● {status}</span>
                        <small>Joined {user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</small>
                      </div>

                      <div className="identity-actions">
                        <button className="secondary" onClick={()=>openIdentity(user)}>View Identity</button>
                        <select
                          className="identity-status-select"
                          value={status}
                          onChange={e=>changeAccountStatus(user, e.target.value)}
                          disabled={statusUpdating}
                          title="Change account lifecycle status"
                        >
                          {ACCOUNT_STATUSES.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {selectedIdentity && (
              <div className="identity-modal-backdrop" onClick={()=>setSelectedIdentity(null)}>
                <section className="identity-modal" onClick={e=>e.stopPropagation()}>
                  <div className="identity-modal-head">
                    <div>
                      <span className="eyebrow">IDENTITY RECORD</span>
                      <h2>{selectedIdentity.full_name || 'HOWDI Identity'}</h2>
                      <p>{selectedIdentity.email || 'No email'} · {selectedIdentity.phone || 'No phone'}</p>
                    </div>
                    <button className="secondary" onClick={()=>setSelectedIdentity(null)}>Close</button>
                  </div>

                  {identityLoading ? (
                    <div className="empty-state">Loading identity details…</div>
                  ) : (
                    <>
                      <div className="identity-detail-grid">
                        <div><span>HOWDI ID</span><strong>{selectedIdentity.howdi_id || '—'}</strong></div>
                        <div><span>Master ID</span><strong>{selectedIdentity.master_id || '—'}</strong></div>
                        <div><span>Identity UUID</span><strong>{selectedIdentity.identity_uuid || selectedIdentity.user_identity_uuid || selectedIdentity.id || '—'}</strong></div>
                        <div><span>Account Type</span><strong>{selectedIdentity.account_type_code || selectedIdentity.account_type || selectedIdentity.account_type_name || 'CUSTOMER'}</strong></div>
                        <div><span>Role</span><strong>{selectedIdentity.role || 'customer'}</strong></div>
                        <div><span>Lifecycle Status</span><strong className={`status-text ${statusClass(getAccountStatus(selectedIdentity))}`}>{getAccountStatus(selectedIdentity)}</strong></div>
                      </div>

                      <div className="identity-status-editor">
                        <div>
                          <span className="eyebrow">ACCOUNT LIFECYCLE CONTROL</span>
                          <h3>Change account status</h3>
                          <p>The reason is stored with the status change when supported by the backend foundation.</p>
                        </div>
                        <div className="identity-status-form">
                          <select value={getAccountStatus(selectedIdentity)} onChange={e=>changeAccountStatus(selectedIdentity, e.target.value)} disabled={statusUpdating}>
                            {ACCOUNT_STATUSES.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                          <input value={statusReason} onChange={e=>setStatusReason(e.target.value)} placeholder="Reason for status change (optional)" disabled={statusUpdating} />
                        </div>
                      </div>

                      <div className="status-history-panel">
                        <div className="panel-head">
                          <div>
                            <span className="eyebrow">AUDIT TRAIL</span>
                            <h3>Status History</h3>
                          </div>
                          <button className="secondary" onClick={()=>loadIdentityHistory(selectedIdentity.id)}>↻ Refresh history</button>
                        </div>

                        {!identityHistory.length && <div className="empty-state">No status changes recorded yet.</div>}
                        <div className="status-history-list">
                          {identityHistory.map((entry, index) => (
                            <div className="status-history-row" key={entry.id || `${entry.created_at || ''}-${index}`}>
                              <div className="history-status">{entry.previous_status || 'CREATED'} <span>→</span> <strong>{entry.new_status || '—'}</strong></div>
                              <div className="history-meta">
                                <span>{entry.change_reason || 'No reason recorded'}</span>
                                <small>{entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN') : '—'}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
        )}


        {tab==='categories' && (
          <div className="page"><section className="workspace"><form className="editor panel" onSubmit={saveCategory}><div className="panel-head"><div><span className="eyebrow">CATALOGUE ROOT</span><h3>{editingCategory?'Edit category':'Create category'}</h3></div></div><input placeholder="Category name" value={categoryForm.name} onChange={e=>setCategoryForm({...categoryForm,name:e.target.value})} required/><div className="row"><input placeholder="Icon" value={categoryForm.icon} onChange={e=>setCategoryForm({...categoryForm,icon:e.target.value})}/><input placeholder="Description" value={categoryForm.description} onChange={e=>setCategoryForm({...categoryForm,description:e.target.value})}/></div><label className="check"><input type="checkbox" checked={categoryForm.visible} onChange={e=>setCategoryForm({...categoryForm,visible:e.target.checked})}/> Visible to customers</label><label className="check"><input type="checkbox" checked={categoryForm.showOnHome} onChange={e=>setCategoryForm({...categoryForm,showOnHome:e.target.checked})}/> Show on homepage</label><div className="actions"><button className="primary">{editingCategory?'Update':'Add category'}</button>{editingCategory&&<button type="button" onClick={()=>{setEditingCategory(null);setCategoryForm({name:'',icon:'🧶',description:'',visible:true,showOnHome:true})}}>Cancel</button>}</div></form><div className="panel list"><div className="list-head"><div><span className="eyebrow">CURRENT CATALOGUE</span><h3>{categories.length} categories</h3></div></div>{categories.map(c=><div className="item" key={c.id}><div className="icon">{c.icon}</div><div className="grow"><strong>{c.name}</strong><span>{c.description||'No description'}</span></div><span className={c.visible?'pill on':'pill off'}>{c.visible?'VISIBLE':'HIDDEN'}</span><button onClick={()=>toggleCategory(c)}>{c.visible?'Hide':'Show'}</button><button onClick={()=>{setEditingCategory(c);setCategoryForm({name:c.name,icon:c.icon||'🧶',description:c.description||'',visible:c.visible!==false,showOnHome:c.showOnHome!==false})}}>Edit</button></div>)}</div></section></div>
        )}

        {tab==='subcategories' && (
          <div className="page"><section className="workspace"><form className="editor panel" onSubmit={saveSubcategory}><div className="panel-head"><div><span className="eyebrow">CATALOGUE BRANCH</span><h3>{editingSubcategory?'Edit subcategory':'Create subcategory'}</h3></div></div><select value={subcategoryForm.categoryId} onChange={e=>setSubcategoryForm({...subcategoryForm,categoryId:e.target.value})} required><option value="">Select parent category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select><div className="row"><input placeholder="Subcategory name" value={subcategoryForm.name} onChange={e=>setSubcategoryForm({...subcategoryForm,name:e.target.value})} required/><input placeholder="Icon" value={subcategoryForm.icon} onChange={e=>setSubcategoryForm({...subcategoryForm,icon:e.target.value})}/></div><label className="check"><input type="checkbox" checked={subcategoryForm.visible} onChange={e=>setSubcategoryForm({...subcategoryForm,visible:e.target.checked})}/> Visible to customers</label><div className="actions"><button className="primary">{editingSubcategory?'Update':'Add subcategory'}</button>{editingSubcategory&&<button type="button" onClick={()=>{setEditingSubcategory(null);setSubcategoryForm({categoryId:categories[0]?.id||'',name:'',icon:'🧶',visible:true})}}>Cancel</button>}</div></form><div className="panel list"><div className="list-head"><div><span className="eyebrow">CURRENT CATALOGUE</span><h3>{subcategories.length} subcategories</h3></div></div>{subcategories.map(s=><div className="item" key={s.id}><div className="icon">{s.icon}</div><div className="grow"><strong>{s.name}</strong><span>{categoryName(s.categoryId)}</span></div><span className={s.visible?'pill on':'pill off'}>{s.visible?'VISIBLE':'HIDDEN'}</span><button onClick={()=>toggleSubcategory(s)}>{s.visible?'Hide':'Show'}</button><button onClick={()=>{setEditingSubcategory(s);setSubcategoryForm({categoryId:s.categoryId,name:s.name,icon:s.icon||'🧶',visible:s.visible!==false})}}>Edit</button></div>)}</div></section></div>
        )}

        {tab==='products' && (
          <div className="page">
            {productStudioOpen ? (
              <form className="product-studio" onSubmit={saveProduct}>
                <div className="studio-hero">
                  <div>
                    <span className="eyebrow">HOWDI PRODUCT STUDIO</span>
                    <h2>{editingProduct?'Edit product':'Create a marketplace-ready product'}</h2>
                    <p>Media first, structured information, inventory, offers and delivery controls in one guided workspace.</p>
                  </div>
                  <div className="studio-actions">
                    <button type="button" onClick={aiAssistProduct}>✨ HOWDI AI Assist</button>
                    <button type="button" onClick={closeProductStudio}>← Back to products</button>
                    <button className="primary">{editingProduct?'Save changes':'Publish product'}</button>
                  </div>
                </div>

                <div className="studio-nav">
                  {[
                    ['media','📸 Media & AI'],
                    ['basic','📝 Product information'],
                    ['details','📖 Details & care'],
                    ['specs','⚙️ Specifications'],
                    ['commerce','💰 Price & offers'],
                    ['inventory','📦 Inventory'],
                    ['delivery','🚚 Delivery & publish']
                  ].map(([id,label])=><button type="button" key={id} className={productStudioSection===id?'active':''} onClick={()=>setProductStudioSection(id)}>{label}</button>)}
                </div>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>01</span><div><h3>Product media studio</h3><p>Upload up to 8 photos. The first image becomes the main customer image.</p></div></div>
                  <div className="media-drop" onClick={()=>mediaInputRef.current?.click()}>
                    <div className="media-drop-icon">📷</div>
                    <strong>Upload or capture product photos</strong>
                    <small>JPG, PNG or WebP · photos are resized for faster catalogue loading</small>
                    <button type="button">Choose photos</button>
                    <input ref={mediaInputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={e=>addProductMedia(e.target.files)}/>
                  </div>
                  <div className="media-grid">
                    {(productForm.media||[]).map((item,index)=><div className="media-card" key={item.id}>
                      <img src={item.url} alt={item.name||`Product ${index+1}`}/>
                      {index===0&&<span>MAIN PHOTO</span>}
                      <button type="button" onClick={()=>removeProductMedia(item.id)}>×</button>
                    </div>)}
                  </div>
                  <div className="ai-note"><strong>🤖 AI Photo & Detail Assist</strong><p>Use AI Assist to generate starter copy from the information entered. Real photo-vision/background AI will be connected as the next integration so the product itself is never silently changed.</p><button type="button" onClick={aiAssistProduct}>Generate suggestions</button></div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>02</span><div><h3>Product identity</h3><p>Required fields are marked with *</p></div></div>
                  <div className="studio-form-grid">
                    <label className="wide">Product name *<input value={productForm.name} onChange={e=>setProductField('name',e.target.value)} placeholder="Example: Handmade Crochet Shoulder Bag" required/></label>
                    <label className="wide">Product summary<input value={productForm.summary} onChange={e=>setProductField('summary',e.target.value)} placeholder="Short customer-friendly summary"/></label>
                    <label>Category *<select value={productForm.categoryId} onChange={e=>setProductForm(current=>({...current,categoryId:e.target.value,subcategoryId:''}))} required><option value="">Select category</option>{categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    <label>Subcategory<select value={productForm.subcategoryId} onChange={e=>setProductField('subcategoryId',e.target.value)}><option value="">Select subcategory</option>{subcategories.filter(item=>String(item.categoryId)===String(productForm.categoryId)).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    <label>Brand name<input value={productForm.brand} onChange={e=>setProductField('brand',e.target.value)} placeholder="Optional"/></label>
                    <label>Product type<input value={productForm.productType} onChange={e=>setProductField('productType',e.target.value)} placeholder="Bag, Top, Table Runner..."/></label>
                    <label>SKU<input value={productForm.sku} onChange={e=>setProductField('sku',e.target.value)} placeholder="Unique seller SKU"/></label>
                    <div className="inline-field"><label>Generate SKU</label><button type="button" onClick={generateProductSku}>Generate unique SKU</button></div>
                    <label>Barcode<input value={productForm.barcode} onChange={e=>setProductField('barcode',e.target.value)} placeholder="Optional"/></label>
                    <label>HSN code<input value={productForm.hsnCode} onChange={e=>setProductField('hsnCode',e.target.value)} placeholder="Optional"/></label>
                    <label className="wide">Search tags<input value={productForm.tags} onChange={e=>setProductField('tags',e.target.value)} placeholder="handmade, crochet, gift, local business"/></label>
                  </div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>03</span><div><h3>Description, usage & care</h3><p>Keep the important information structured so customers can scan it quickly.</p></div></div>
                  <div className="studio-form-grid">
                    <label className="wide">Full product description<textarea rows="7" value={productForm.description} onChange={e=>setProductField('description',e.target.value)} placeholder="Tell the customer what makes this product useful and special..."/></label>
                    <label>Material<input value={productForm.material} onChange={e=>setProductField('material',e.target.value)} placeholder="Cotton yarn, iron, wood..."/></label>
                    <label>Size type<select value={productForm.sizeType} onChange={e=>setProductField('sizeType',e.target.value)}><option value="standard">Standard sizes</option><option value="free">Free size</option><option value="custom">Custom size</option></select></label>
                    <label className="wide">Usage<textarea rows="4" value={productForm.usage} onChange={e=>setProductField('usage',e.target.value)} placeholder="Daily use, gifting, travel..."/></label>
                    <label className="wide">Care instructions<textarea rows="4" value={productForm.care} onChange={e=>setProductField('care',e.target.value)} placeholder="Wash, storage and maintenance instructions"/></label>
                  </div>
                  <div className="check-grid">
                    <label className="check"><input type="checkbox" checked={productForm.freeSize} onChange={e=>setProductField('freeSize',e.target.checked)}/> Free size</label>
                    <label className="check"><input type="checkbox" checked={productForm.washable} onChange={e=>setProductField('washable',e.target.checked)}/> Washable</label>
                    <label>Wash type<select value={productForm.washType} onChange={e=>setProductField('washType',e.target.value)}><option value="">Not specified</option><option>Hand wash</option><option>Machine wash</option><option>Dry clean only</option></select></label>
                    <label className="check"><input type="checkbox" checked={productForm.ironable} onChange={e=>setProductField('ironable',e.target.checked)}/> Ironable</label>
                    <label>Iron temperature<select value={productForm.ironTemperature} onChange={e=>setProductField('ironTemperature',e.target.value)}><option value="">Not specified</option><option>Low</option><option>Medium</option><option>High</option></select></label>
                  </div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>04</span><div><h3>Specifications</h3><p>Add only the attributes relevant to this product. This keeps one product system flexible across categories.</p></div><button type="button" onClick={addSpecification}>+ Add specification</button></div>
                  <div className="spec-list">
                    {(productForm.specifications||[]).map((item,index)=><div className="spec-row" key={index}><input value={item.label||''} onChange={e=>updateSpecification(index,'label',e.target.value)} placeholder="Specification (e.g. Dimensions)"/><input value={item.value||''} onChange={e=>updateSpecification(index,'value',e.target.value)} placeholder="Value (e.g. 30 × 20 cm)"/><button type="button" onClick={()=>removeSpecification(index)}>Remove</button></div>)}
                    {!(productForm.specifications||[]).length&&<div className="empty-state">No specifications yet. Add material, dimensions, capacity, compatibility or other product-specific details.</div>}
                  </div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>05</span><div><h3>Price & offer application</h3><p>The product price stays separate from campaigns so offers can be enabled only when eligible.</p></div></div>
                  <div className="studio-form-grid">
                    <label>MRP ₹<input type="number" min="0" step="0.01" value={productForm.mrp} onChange={e=>setProductField('mrp',e.target.value)}/></label>
                    <label>Selling price ₹<input type="number" min="0" step="0.01" value={productForm.sellingPrice} onChange={e=>setProductField('sellingPrice',e.target.value)} required/></label>
                    <label>Direct offer price ₹<input type="number" min="0" step="0.01" value={productForm.offerPrice} onChange={e=>setProductField('offerPrice',e.target.value)}/></label>
                    <label>Cost price ₹<input type="number" min="0" step="0.01" value={productForm.costPrice} onChange={e=>setProductField('costPrice',e.target.value)}/></label>
                    <label>GST %<input type="number" min="0" step="0.01" value={productForm.gstPercent} onChange={e=>setProductField('gstPercent',e.target.value)}/></label>
                    <label>Platform charge %<input type="number" min="0" step="0.01" value={productForm.platformChargePercent} onChange={e=>setProductField('platformChargePercent',e.target.value)}/></label>
                    <label className="wide">Apply existing HOWDI offer<select value={productForm.appliedOfferCode} onChange={e=>setProductField('appliedOfferCode',e.target.value)}><option value="">No campaign linked</option>{coupons.filter(item=>item.active!==false).map(item=><option key={item.id} value={item.code}>{item.code} — {item.campaignName||'HOWDI offer'}</option>)}</select></label>
                  </div>
                  <div className="check-grid">
                    <label className="check"><input type="checkbox" checked={productForm.featured} onChange={e=>setProductField('featured',e.target.checked)}/> Featured</label>
                    <label className="check"><input type="checkbox" checked={productForm.newArrival} onChange={e=>setProductField('newArrival',e.target.checked)}/> New arrival</label>
                    <label className="check"><input type="checkbox" checked={productForm.bestSeller} onChange={e=>setProductField('bestSeller',e.target.checked)}/> Best seller</label>
                    <label className="check"><input type="checkbox" checked={productForm.offerProduct} onChange={e=>setProductField('offerProduct',e.target.checked)}/> Offer product</label>
                  </div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>06</span><div><h3>Inventory, weight & availability</h3><p>Stock is automatically unavailable to customers when quantity reaches zero.</p></div></div>
                  <div className="studio-form-grid">
                    <label>Inventory type<select value={productForm.inventoryType} onChange={e=>setProductField('inventoryType',e.target.value)}><option value="simple">Simple stock</option><option value="variant">Variant stock</option><option value="bulk">Bulk / weight stock</option></select></label>
                    <label>Current stock<input type="number" min="0" step="0.001" value={productForm.stock} onChange={e=>setProductField('stock',e.target.value)} required/></label>
                    <label>Low stock alert<input type="number" min="0" step="0.001" value={productForm.lowStockThreshold} onChange={e=>setProductField('lowStockThreshold',e.target.value)}/></label>
                    <label>Selling unit<select value={productForm.unit} onChange={e=>setProductField('unit',e.target.value)}>{['piece','kg','gram','litre','ml','pack','box','set','bundle','metre','dozen'].map(unit=><option key={unit} value={unit}>{unit}</option>)}</select></label>
                    <label>Net weight<input type="number" min="0" step="0.001" value={productForm.netWeight} onChange={e=>setProductField('netWeight',e.target.value)} placeholder="Number only"/></label>
                  </div>
                  <div className="availability-preview"><strong>{Number(productForm.stock||0)>0?'🟢 In stock':'🔴 Out of stock'}</strong><span>{Number(productForm.stock||0)>0?'Customer can add this product to cart.':'Customer Add to Cart should automatically be disabled.'}</span></div>
                </section>

                <section className="studio-panel">
                  <div className="studio-section-title"><span>07</span><div><h3>Delivery, returns & publishing</h3><p>Product rules sit on top of the platform’s existing location and delivery rules.</p></div></div>
                  <div className="studio-form-grid">
                    <label>Delivery pricing<select value={productForm.deliveryMode} onChange={e=>setProductField('deliveryMode',e.target.value)}><option value="platform">Use platform rules</option><option value="free">Free delivery</option><option value="paid">Seller-defined charge</option><option value="conditional">Free above order value</option></select></label>
                    <label>Delivery charge ₹<input type="number" min="0" step="0.01" value={productForm.deliveryCharge} onChange={e=>setProductField('deliveryCharge',e.target.value)}/></label>
                    <label>Free delivery above ₹<input type="number" min="0" step="0.01" value={productForm.freeDeliveryAbove} onChange={e=>setProductField('freeDeliveryAbove',e.target.value)}/></label>
                    <label>Net weight / shipping weight<input type="number" min="0" step="0.001" value={productForm.netWeight} onChange={e=>setProductField('netWeight',e.target.value)}/></label>
                    <label>Package length<input type="number" min="0" step="0.1" value={productForm.packageLength} onChange={e=>setProductField('packageLength',e.target.value)}/></label>
                    <label>Package width<input type="number" min="0" step="0.1" value={productForm.packageWidth} onChange={e=>setProductField('packageWidth',e.target.value)}/></label>
                    <label>Package height<input type="number" min="0" step="0.1" value={productForm.packageHeight} onChange={e=>setProductField('packageHeight',e.target.value)}/></label>
                    <label>Status<select value={productForm.status} onChange={e=>setProductField('status',e.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label>
                    <label>Return window (days)<input type="number" min="0" value={productForm.returnDays} onChange={e=>setProductField('returnDays',e.target.value)}/></label>
                  </div>
                  <div className="check-grid">
                    <label className="check"><input type="checkbox" checked={productForm.visible} onChange={e=>setProductField('visible',e.target.checked)}/> Visible to customers</label>
                    <label className="check"><input type="checkbox" checked={productForm.returnable} onChange={e=>setProductField('returnable',e.target.checked)}/> Returnable</label>
                    <label className="check"><input type="checkbox" checked={productForm.customizationAvailable} onChange={e=>setProductField('customizationAvailable',e.target.checked)}/> Customisation available</label>
                  </div>
                  {productForm.customizationAvailable&&<label className="wide">Customisation note<textarea rows="3" value={productForm.customizationNote} onChange={e=>setProductField('customizationNote',e.target.value)} placeholder="Customer can choose colour, size, add a name or share a reference image..."/></label>}
                  <div className="publish-bar"><div><strong>Ready to publish?</strong><span>Review media, pricing and stock before saving.</span></div><div><button type="button" onClick={closeProductStudio}>Cancel</button><button className="primary">{editingProduct?'Save product':'Publish product'}</button></div></div>
                </section>
              </form>
            ) : (
              <section className="panel list full">
                <div className="list-head">
                  <div><span className="eyebrow">CATALOGUE PRODUCTS</span><h3>{filteredProducts.length} of {products.length} products</h3></div>
                  <div className="product-list-actions"><input className="search" placeholder="Search product, brand, category..." value={search} onChange={e=>setSearch(e.target.value)}/><button className="primary" onClick={()=>openProductStudio()}>+ Create product</button></div>
                </div>
                {filteredProducts.map(p=><div className="item product-row" key={p.id}>
                  <div className="icon">{p.media?.[0]?.url?<img src={p.media[0].url} alt=""/>:p.icon||'🧶'}</div>
                  <div className="grow"><strong>{p.name}</strong><span>{categoryName(p.categoryId)} · {p.brand||p.subcategory||'—'} · ₹{Number(p.price||p.sellingPrice||0).toLocaleString('en-IN')} · {p.unit||'piece'}</span></div>
                  <span className="stock">{Number(p.stock ?? 0)} {p.unit||'stock'}</span>
                  <span className={Number(p.stock||0)>0?'pill on':'pill off'}>{Number(p.stock||0)>0?'IN STOCK':'OUT OF STOCK'}</span>
                  <span className={p.visible?'pill on':'pill off'}>{p.visible?'VISIBLE':'HIDDEN'}</span>
                  <button onClick={()=>openProductStudio(p)}>Edit</button>
                  <button onClick={()=>toggleProduct(p)}>{p.visible?'Hide':'Show'}</button>
                </div>)}
                {filteredProducts.length===0&&<div className="empty-state">No matching products found. Create your first product from Product Studio.</div>}
              </section>
            )}
          </div>
        )}

        {tab==='variants' && (
          <div className="page">
            <section className="variant-hero"><div><span className="eyebrow">PRODUCT VARIANT ENGINE</span><h2>Price, offer and stock at variant level.</h2><p>Each color/size combination gets its own SKU, regular price, offer price and inventory count.</p></div><div className="variant-hero-stats"><span><b>{variants.length}</b> variants</span><span><b>{variants.filter(v=>Number(v.stock)<=Number(v.lowStockThreshold??5)).length}</b> low stock</span></div></section>
            <section className="variant-workspace">
              <form className="editor panel variant-editor" onSubmit={saveVariant}>
                <div className="panel-head"><div><span className="eyebrow">VARIANT CREATOR</span><h3>{editingVariant?'Edit variant':'Add variant'}</h3></div>{editingVariant&&<span className="reserved">EDITING</span>}</div>
                <label>Product<select value={variantForm.productId} onChange={e=>setVariantForm({...variantForm,productId:e.target.value})} required><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                <div className="variant-two-col"><label>Color<input placeholder="Example: Pink" value={variantForm.color} onChange={e=>setVariantForm({...variantForm,color:e.target.value})}/></label><label>Size<input placeholder="Example: Medium" value={variantForm.size} onChange={e=>setVariantForm({...variantForm,size:e.target.value})}/></label></div>
                <label>Unique SKU<div className="coupon-code-row"><input placeholder="HOWDI-BAG-PINK-M-AB12" value={variantForm.sku} onChange={e=>setVariantForm({...variantForm,sku:e.target.value.toUpperCase()})} required/><button type="button" className="generate-code" onClick={generateVariantSku}>✨ Generate</button></div></label>
                <div className="variant-two-col"><label>Regular price ₹<input type="number" min="1" step="0.01" value={variantForm.regularPrice} onChange={e=>updateVariantRegularPrice(e.target.value)} required/></label><label>Offer price ₹<input type="number" min="0" step="0.01" value={variantForm.offerPrice} onChange={e=>updateVariantOfferPrice(e.target.value)}/></label></div>
                <div className="variant-two-col"><label>Discount %<input type="number" min="0" max="100" step="0.01" value={variantForm.discountPercent} onChange={e=>updateVariantDiscount(e.target.value)}/></label><div className="variant-savings"><span>SAVINGS</span><b>₹{Math.max(0,Number(variantForm.regularPrice||0)-Number(variantForm.offerPrice||variantForm.regularPrice||0)).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></div></div>
                <div className="variant-two-col"><label>Stock quantity<input type="number" min="0" value={variantForm.stock} onChange={e=>setVariantForm({...variantForm,stock:e.target.value})} required/></label><label>Low-stock alert at<input type="number" min="0" value={variantForm.lowStockThreshold} onChange={e=>setVariantForm({...variantForm,lowStockThreshold:e.target.value})}/></label></div>
                <label className="check"><input type="checkbox" checked={variantForm.active} onChange={e=>setVariantForm({...variantForm,active:e.target.checked})}/> Variant active</label>
                <div className="actions"><button className="primary">{editingVariant?'Update variant':'Create variant'}</button>{editingVariant&&<button type="button" onClick={resetVariantForm}>Cancel</button>}</div>
              </form>
              <section className="panel variant-list"><div className="list-head"><div><span className="eyebrow">VARIANT LIBRARY</span><h3>{filteredVariants.length} of {variants.length} variants</h3></div><input className="search" placeholder="Search SKU, product, color, size..." value={variantSearch} onChange={e=>setVariantSearch(e.target.value)}/></div><div className="variant-table">{filteredVariants.map(v=>{const savings=Math.max(0,Number(v.regularPrice||0)-Number(v.offerPrice||v.regularPrice||0));const isLow=Number(v.stock)<=Number(v.lowStockThreshold??5);return <article className="variant-item" key={v.id}><div className="variant-main"><div className="variant-ticket">◈</div><div><strong>{variantProductName(v.productId)}</strong><span>{v.color||'No color'} · {v.size||'No size'} · {v.sku}</span></div></div><div className="variant-price"><b>₹{Number(v.offerPrice||v.regularPrice||0).toLocaleString('en-IN')}</b><span>Regular ₹{Number(v.regularPrice||0).toLocaleString('en-IN')} · Save ₹{savings.toLocaleString('en-IN')}</span></div><div className={isLow?'variant-stock low':'variant-stock'}><b>{v.stock}</b><span>{isLow?'LOW STOCK':'IN STOCK'}</span></div><span className={v.active?'pill on':'pill off'}>{v.active?'ACTIVE':'INACTIVE'}</span><div className="variant-actions"><button onClick={()=>toggleVariant(v)}>{v.active?'Disable':'Activate'}</button><button onClick={()=>editVariant(v)}>Edit</button><button className="danger-button" onClick={()=>deleteVariant(v)}>Delete</button></div></article>})}{filteredVariants.length===0&&<div className="empty-state">◈ {variants.length?'No matching variants found.':'No variants created yet. Add the first product variant.'}</div>}</div></section>
            </section>
          </div>
        )}



        {tab==='inventory' && (
          <div className="page">
            <section className="inventory-hero"><div><span className="eyebrow">INVENTORY CONTROL</span><h2>Every stock change leaves a trail.</h2><p>Record stock in, stock out and exact-count adjustments against the existing variant SKU.</p></div><div className="inventory-hero-stats"><span><b>{inventoryMoves.length}</b> movements</span><span><b>{variants.filter(v=>Number(v.stock||0)<=Number(v.lowStockThreshold??5)).length}</b> low stock</span></div></section>
            <section className="inventory-workspace">
              <form className="editor panel inventory-editor" onSubmit={saveInventoryMove}>
                <div className="panel-head"><div><span className="eyebrow">STOCK MOVEMENT</span><h3>Update inventory</h3></div></div>
                <label>Variant<select value={inventoryForm.variantId} onChange={e=>setInventoryForm({...inventoryForm,variantId:e.target.value})} required><option value="">Select variant SKU</option>{variants.map(v=><option key={v.id} value={v.id}>{inventoryVariantLabel(v)} · Stock {Number(v.stock||0)}</option>)}</select></label>
                <div className="inventory-two-col"><label>Movement<select value={inventoryForm.mode} onChange={e=>setInventoryForm({...inventoryForm,mode:e.target.value})}><option value="in">Stock In (+)</option><option value="out">Stock Out (−)</option><option value="set">Set Exact Stock</option></select></label><label>{inventoryForm.mode==='set'?'New exact stock':'Quantity'}<input type="number" min="0" step="1" placeholder="0" value={inventoryForm.quantity} onChange={e=>setInventoryForm({...inventoryForm,quantity:e.target.value})} required/></label></div>
                <label>Reason<input placeholder="Example: New supplier stock received" value={inventoryForm.reason} onChange={e=>setInventoryForm({...inventoryForm,reason:e.target.value})}/></label>
                <label>Reference / Order ID (optional)<input placeholder="PO-1001 or ORDER-1001" value={inventoryForm.reference} onChange={e=>setInventoryForm({...inventoryForm,reference:e.target.value})}/></label>
                <div className="inventory-note">Orders and returns will later create these movements automatically. For now this is the controlled Admin stock history.</div>
                <div className="actions"><button className="primary">Save stock movement</button></div>
              </form>
              <section className="panel inventory-list"><div className="list-head"><div><span className="eyebrow">MOVEMENT HISTORY</span><h3>{filteredInventoryMoves.length} of {inventoryMoves.length} movements</h3></div><input className="search" placeholder="Search SKU, reason or reference..." value={inventorySearch} onChange={e=>setInventorySearch(e.target.value)}/></div><div className="inventory-table">{filteredInventoryMoves.map(m=>{const sign=m.delta>0?'+' : m.delta<0?'−' : '→';const cls=m.delta>0?'in':m.delta<0?'out':'set';return <article className="inventory-item" key={m.id}><div className="inventory-main"><div className={`inventory-ticket ${cls}`}>{m.mode==='in'?'＋':m.mode==='out'?'−':'↔'}</div><div><strong>{m.sku}</strong><span>{m.productName}{m.color?` · ${m.color}`:''}{m.size?` / ${m.size}`:''}</span></div></div><div className="inventory-change"><b>{m.before} → {m.after}</b><span className={`inventory-delta ${cls}`}>{sign}{Math.abs(Number(m.delta||0))} units</span></div><div className="inventory-reason"><b>{m.reason}</b><span>{m.reference||'No reference'} · {new Date(m.createdAt).toLocaleString('en-IN')}</span></div><span className={`inventory-mode ${cls}`}>{m.mode==='in'?'STOCK IN':m.mode==='out'?'STOCK OUT':'SET STOCK'}</span></article>})}{filteredInventoryMoves.length===0&&<div className="empty-state">📦 {inventoryMoves.length?'No matching inventory movements found.':'No stock movements recorded yet.'}</div>}</div></section>
            </section>
          </div>
        )}

        {tab==='locations' && (
          <div className="page">
            <section className="location-hero"><div><span className="eyebrow">HOWDI DELIVERY ENGINE</span><h2>Pincode serviceability with delivery rules.</h2><p>Control where HOWDI delivers, what customers pay, express availability and estimated delivery days.</p></div><div className="location-hero-stats"><span><b>{locations.filter(l=>l.active!==false && l.serviceable!==false).length}</b> serviceable</span><span><b>{locations.length}</b> total</span></div></section>
            <section className="location-workspace">
              <form className="editor panel location-editor" onSubmit={saveLocation}>
                <div className="panel-head"><div><span className="eyebrow">PINCODE CREATOR</span><h3>{editingLocation?'Edit location':'Add location'}</h3></div>{editingLocation&&<span className="reserved">EDITING</span>}</div>
                <div className="location-two-col"><label>Pincode<input inputMode="numeric" maxLength="6" placeholder="560001" value={locationForm.pincode} onChange={e=>setLocationForm({...locationForm,pincode:e.target.value.replace(/\D/g,'').slice(0,6)})} required/></label><label>City<input placeholder="Bengaluru" value={locationForm.city} onChange={e=>setLocationForm({...locationForm,city:e.target.value})} required/></label></div>
                <div className="location-two-col"><label>State<input placeholder="Karnataka" value={locationForm.state} onChange={e=>setLocationForm({...locationForm,state:e.target.value})} required/></label><label>Country<input value={locationForm.country} onChange={e=>setLocationForm({...locationForm,country:e.target.value})}/></label></div>
                <div className="location-section-title">SERVICEABILITY</div>
                <div className="location-two-col"><label>Estimated minimum days<input type="number" min="0" value={locationForm.estimatedDaysMin} onChange={e=>setLocationForm({...locationForm,estimatedDaysMin:e.target.value})}/></label><label>Estimated maximum days<input type="number" min="0" value={locationForm.estimatedDaysMax} onChange={e=>setLocationForm({...locationForm,estimatedDaysMax:e.target.value})}/></label></div>
                <div className="location-two-col"><label>Standard delivery charge ₹<input type="number" min="0" step="0.01" value={locationForm.standardCharge} onChange={e=>setLocationForm({...locationForm,standardCharge:e.target.value})}/></label><label>Free delivery above ₹<input type="number" min="0" step="0.01" value={locationForm.freeDeliveryAbove} onChange={e=>setLocationForm({...locationForm,freeDeliveryAbove:e.target.value})}/></label></div>
                <label className="check"><input type="checkbox" checked={locationForm.expressAvailable} onChange={e=>setLocationForm({...locationForm,expressAvailable:e.target.checked})}/> Express delivery available</label>
                {locationForm.expressAvailable&&<label>Express delivery charge ₹<input type="number" min="0" step="0.01" value={locationForm.expressCharge} onChange={e=>setLocationForm({...locationForm,expressCharge:e.target.value})}/></label>}
                <label className="check"><input type="checkbox" checked={locationForm.serviceable} onChange={e=>setLocationForm({...locationForm,serviceable:e.target.checked})}/> This pincode is serviceable</label>
                <label className="check"><input type="checkbox" checked={locationForm.active} onChange={e=>setLocationForm({...locationForm,active:e.target.checked})}/> Location rule active</label>
                <div className="actions"><button className="primary">{editingLocation?'Update location':'Create location rule'}</button>{editingLocation&&<button type="button" onClick={resetLocationForm}>Cancel</button>}</div>
              </form>
              <section className="panel location-list"><div className="list-head"><div><span className="eyebrow">SERVICEABILITY LIBRARY</span><h3>{filteredLocations.length} of {locations.length} locations</h3></div><input className="search" placeholder="Search pincode, city or state..." value={locationSearch} onChange={e=>setLocationSearch(e.target.value)}/></div><div className="location-table">{filteredLocations.map(item=>{const enabled=item.active!==false&&item.serviceable!==false;return <article className="location-item" key={item.id}><div className="location-main"><div className="location-ticket">📍</div><div><strong>{item.pincode} · {item.city}</strong><span>{item.state}, {item.country||'India'} · {item.estimatedDaysMin||0}-{item.estimatedDaysMax||0} days</span></div></div><div className="location-summary"><b>₹{Number(item.standardCharge||0).toLocaleString('en-IN')} standard</b><span>Free above ₹{Number(item.freeDeliveryAbove||0).toLocaleString('en-IN')} · {item.expressAvailable?'⚡ Express available':'Standard only'}</span></div><span className={enabled?'pill on':'pill off'}>{enabled?'SERVICEABLE':'NOT AVAILABLE'}</span><div className="location-actions"><button onClick={()=>toggleLocationActive(item)}>{item.active!==false?'Deactivate':'Activate'}</button><button onClick={()=>toggleLocationService(item)}>{item.serviceable!==false?'Disable service':'Enable service'}</button><button onClick={()=>editLocation(item)}>Edit</button><button className="danger-button" onClick={()=>deleteLocation(item)}>Delete</button></div></article>})}{filteredLocations.length===0&&<div className="empty-state">📍 {locations.length?'No matching locations found.':'No pincodes created yet. Add your first delivery location.'}</div>}</div></section>
            </section>
          </div>
        )}

        {tab==='logistics' && (
          <div className="page">
            <section className="logistics-admin-hero">
              <div>
                <span className="eyebrow">HOWDI LOGISTICS CONTROL</span>
                <h2>Every shipment in one place.</h2>
                <p>Monitor vendor dispatch, HOWDI Delivery, Shiprocket AWBs, tracking status and logistics exceptions without opening the Vendor portal.</p>
              </div>
              <button className="primary" onClick={loadLogistics} disabled={logisticsLoading}>{logisticsLoading?'Refreshing…':'↻ Refresh logistics'}</button>
            </section>

            <section className="panel logistics-filter-panel">
              <input placeholder="Search order, vendor or AWB" value={logisticsQuery} onChange={e=>setLogisticsQuery(e.target.value)}/>
              <select value={logisticsStatus} onChange={e=>setLogisticsStatus(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="NEW">New</option><option value="ACCEPTED">Accepted</option><option value="PACKED">Packed</option>
                <option value="SHIPROCKET_CREATED">Shiprocket created</option><option value="AWB_ASSIGNED">AWB assigned</option>
                <option value="PICKUP_SCHEDULED">Pickup scheduled</option><option value="SHIPPED">Shipped</option><option value="DELIVERED">Delivered</option>
              </select>
              <select value={logisticsMethod} onChange={e=>setLogisticsMethod(e.target.value)}>
                <option value="all">All delivery methods</option>
                <option value="howdi_delivery">HOWDI Delivery</option>
                <option value="own_delivery">Own Delivery</option>
                <option value="ask_each_order">Ask Each Order</option>
              </select>
              <button className="secondary" onClick={loadLogistics}>Apply filters</button>
            </section>

            <section className="panel pickup-mapping-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">SHIPROCKET PICKUP MAPPING</span>
                  <h3>Vendor pickup locations</h3>
                  <p>HOWDI Admin maps each vendor’s saved dispatch address to the matching Shiprocket Pickup Location code.</p>
                </div>
                <button className="secondary" onClick={loadPickupMappings} disabled={pickupMappingsLoading}>
                  {pickupMappingsLoading?'Loading…':'Load vendor pickups'}
                </button>
              </div>
              <div className="pickup-mapping-grid">
                {pickupMappings.length?pickupMappings.map(v=><article className="pickup-mapping-card" key={v.vendor_profile_id}>
                  <div className="pickup-mapping-top">
                    <div><b>{v.business_name}</b><small>{v.vendor_code||`Vendor #${v.vendor_profile_id}`}</small></div>
                    <span className={`pickup-readiness ${v.readiness}`}>{String(v.readiness||'').replaceAll('_',' ')}</span>
                  </div>
                  <div className="pickup-address">
                    <strong>{v.pickup_name||'Pickup address'}</strong>
                    <span>{[v.address_line1,v.address_line2,v.landmark,v.city,v.state,v.pincode].filter(Boolean).join(', ')||'Vendor has not saved a pickup address yet.'}</span>
                    <small>{v.contact_name||'No contact'} {v.phone?`· ${v.phone}`:''}</small>
                  </div>
                  <label>Shiprocket Pickup Location Code
                    <input
                      value={pickupCodeDraft[v.vendor_profile_id]??v.shiprocket_pickup_code??''}
                      onChange={e=>setPickupCodeDraft({...pickupCodeDraft,[v.vendor_profile_id]:e.target.value})}
                      placeholder="Example: Primary, Warehouse, Vendor001"
                      disabled={v.readiness==='missing_profile'||v.readiness==='incomplete_address'}
                    />
                  </label>
                  <div className="pickup-map-actions">
                    <button className="primary"
                      disabled={pickupMappingBusy===String(v.vendor_profile_id)||v.readiness==='missing_profile'||v.readiness==='incomplete_address'}
                      onClick={()=>savePickupMapping(v.vendor_profile_id)}>
                      {pickupMappingBusy===String(v.vendor_profile_id)?'Saving…':'Save mapping'}
                    </button>
                    {v.shiprocket_pickup_code&&<button className="secondary"
                      disabled={pickupMappingBusy===String(v.vendor_profile_id)}
                      onClick={()=>removePickupMapping(v.vendor_profile_id)}>Remove</button>}
                  </div>
                  {v.shiprocket_pickup_code&&<small className="mapped-code">Mapped: {v.shiprocket_pickup_code}</small>}
                </article>):<div className="pickup-empty">Click “Load vendor pickups” to review vendor dispatch addresses and Shiprocket mapping.</div>}
              </div>
            </section>

            <section className="panel logistics-provider-foundation">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">LOGISTICS ARCHITECTURE</span>
                  <h3>HOWDI Multi-Provider Logistics</h3>
                  <p>Shiprocket remains live today. HOWDI Fleet is prepared as a future first-party provider without changing the current Vendor or Customer flow.</p>
                </div>
                <button className="secondary" onClick={loadLogisticsProviders} disabled={logisticsProviderBusy}>
                  {logisticsProviderBusy?'Loading…':'Load providers'}
                </button>
              </div>

              <div className="logistics-provider-grid">
                {logisticsProviders.length?logisticsProviders.map(p=><div className={`logistics-provider-card ${p.provider_key==='howdi_fleet'?'future':''}`} key={p.provider_key}>
                  <div className="logistics-provider-title">
                    <div>
                      <b>{p.provider_name}</b>
                      <small>{p.provider_type} · priority {p.priority}</small>
                    </div>
                    <span className={`logistics-provider-status ${p.is_operational?'live':'standby'}`}>
                      {p.is_operational?'OPERATIONAL':'FOUNDATION / STANDBY'}
                    </span>
                  </div>
                  <p>{p.notes||'—'}</p>
                  <div className="logistics-provider-capabilities">
                    <span>Pickup {p.supports_pickup?'✓':'—'}</span>
                    <span>Tracking {p.supports_tracking?'✓':'—'}</span>
                    <span>COD {p.supports_cod?'✓':'—'}</span>
                    <span>Reverse {p.supports_reverse?'✓':'—'}</span>
                  </div>
                  <div className="logistics-provider-foot">
                    <span>{p.active_zone_count||0} active / {p.total_zone_count||0} total zones</span>
                    {p.provider_key!=='shiprocket'&&p.provider_key!=='vendor_delivery'&&<label>
                      <input type="checkbox" checked={!!p.is_enabled} onChange={e=>toggleLogisticsProvider(p.provider_key,e.target.checked)} disabled={logisticsProviderBusy}/>
                      Enabled
                    </label>}
                  </div>
                  {p.provider_key==='howdi_fleet'&&<small className="fleet-safety-note">Safety gate: this provider cannot become operational until rider, hub and dispatch modules are commissioned.</small>}
                </div>):<div className="logistics-admin-empty">Load providers to view the multi-carrier logistics foundation.</div>}
              </div>

              <div className="logistics-future-routing">
                <b>Future routing model</b>
                <span>HOWDI Delivery → eligible operational HOWDI Fleet zone → otherwise Shiprocket fallback</span>
                <span>Vendor Own Delivery → vendor_delivery provider</span>
                <span>Current production behaviour remains Shiprocket.</span>
              </div>

              {(logisticsZones.length>0||logisticsHubs.length>0)&&<div className="logistics-provider-foundation-meta">
                <span><b>{logisticsZones.length}</b> service-zone records</span>
                <span><b>{logisticsHubs.length}</b> hub records</span>
              </div>}
            </section>

            <section className="panel delivery-control-center">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">DELIVERY GO-LIVE</span>
                  <h3>HOWDI Delivery Control Center</h3>
                  <p>Final operational health check for Shiprocket mapping, AWB readiness, tracking freshness, webhooks and delivery exceptions.</p>
                </div>
                <button className="secondary" onClick={loadDeliveryHealth} disabled={deliveryHealthBusy}>
                  {deliveryHealthBusy?'Checking…':'Run delivery health check'}
                </button>
              </div>

              {deliveryHealth?<>
                <div className={`delivery-readiness delivery-readiness-${String(deliveryHealth.readiness||'ATTENTION').toLowerCase()}`}>
                  <div>
                    <span>DELIVERY SYSTEM</span>
                    <b>{deliveryHealth.readiness}</b>
                  </div>
                  <small>{deliveryHealth.generatedAt?`Checked ${new Date(deliveryHealth.generatedAt).toLocaleString()}`:'Latest check'}</small>
                </div>

                <div className="delivery-health-summary">
                  <div><b>{deliveryHealth.summary?.mappedVendors||0}</b><span>Mapped vendors</span></div>
                  <div><b>{deliveryHealth.summary?.activeHowdiShipments||0}</b><span>Active HOWDI deliveries</span></div>
                  <div><b>{deliveryHealth.summary?.unresolvedExceptions||0}</b><span>Open exceptions</span></div>
                  <div><b>{deliveryHealth.summary?.webhookEvents24h||0}</b><span>Webhook events / 24h</span></div>
                </div>

                <div className="delivery-health-checks">
                  {(deliveryHealth.checks||[]).map(c=><div className={`delivery-health-check ${c.ok?'ok':'attention'}`} key={c.key}>
                    <span className="delivery-health-icon">{c.ok?'✓':'!'}</span>
                    <div><b>{c.label}</b><small>{c.detail}</small></div>
                  </div>)}
                </div>

                <div className="delivery-health-footer">
                  <span><b>Last Shiprocket webhook</b>{deliveryHealth.lastWebhookAt?new Date(deliveryHealth.lastWebhookAt).toLocaleString():'No webhook received yet'}</span>
                  <span><b>Last tracking reconcile</b>{deliveryHealth.lastReconcile?.started_at?new Date(deliveryHealth.lastReconcile.started_at).toLocaleString():'No reconciliation run yet'}</span>
                </div>
              </>:<div className="logistics-admin-empty">Run the delivery health check to verify the complete HOWDI Delivery system.</div>}
            </section>

            <section className="panel tracking-reconcile-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">TRACKING FALLBACK</span>
                  <h3>Shiprocket Tracking Reconciler</h3>
                  <p>Fallback sync for active HOWDI Delivery shipments when a webhook is delayed or missed.</p>
                </div>
                <div className="webhook-panel-actions">
                  <button className="secondary" onClick={loadTrackingReconcileRuns} disabled={trackingHistoryBusy}>
                    {trackingHistoryBusy?'Loading history…':'Load history'}
                  </button>
                  <button className="secondary" onClick={reconcileShiprocketTracking} disabled={trackingReconcileBusy}>
                    {trackingReconcileBusy?'Reconciling…':'Reconcile active shipments'}
                  </button>
                </div>
              </div>

              <div className="tracking-reconcile-summary">
                <div><b>Manual fallback</b><small>Available now from Admin</small></div>
                <div><b>Webhook-safe</b><small>Uses the same central HOWDI status engine</small></div>
                <div><b>Active only</b><small>Accepted / Packed / Shipped / Out for delivery</small></div>
              </div>

              <div className="tracking-run-list">
                {trackingReconcileRuns.length?trackingReconcileRuns.slice(0,8).map(r=><div className="tracking-run-row" key={r.id}>
                  <div><b>Run #{r.id}</b><small>{r.started_at?new Date(r.started_at).toLocaleString():'—'} · {r.trigger_source||'manual'}</small></div>
                  <span>{r.scanned_count||0} scanned</span>
                  <span>{r.updated_count||0} synced</span>
                  <span className={(r.error_count||0)>0?'tracking-run-error':'tracking-run-ok'}>{r.error_count||0} errors</span>
                </div>):<div className="logistics-admin-empty">
                  No reconciliation history yet. Click <b>Reconcile active shipments</b> once, then Load history.
                </div>}
              </div>
            </section>

            <section className="panel delivery-exception-panel">
              <div className="panel-head">
                <div><span className="eyebrow">DELIVERY EXCEPTIONS</span><h3>NDR / RTO / Courier issues</h3><p>HOWDI logistics control for failed delivery attempts, RTO, lost/damaged parcels and other courier exceptions.</p></div>
                <div className="webhook-panel-actions">
                  <select value={deliveryExceptionFilter} onChange={e=>setDeliveryExceptionFilter(e.target.value)}><option value="OPEN">Open</option><option value="ACKNOWLEDGED">Acknowledged</option><option value="RESOLVED">Resolved</option><option value="ALL">All</option></select>
                  <button className="secondary" onClick={()=>loadDeliveryExceptions(deliveryExceptionFilter)} disabled={deliveryExceptionBusy}>{deliveryExceptionBusy?'Loading…':'Load exceptions'}</button>
                </div>
              </div>
              <div className="delivery-exception-stats">
                <div><b>{deliveryExceptionStats.open_count||0}</b><span>Open</span></div>
                <div><b>{deliveryExceptionStats.acknowledged_count||0}</b><span>Acknowledged</span></div>
                <div><b>{deliveryExceptionStats.overdue_count||0}</b><span>Over 24h</span></div>
                <div><b>{deliveryExceptionStats.critical_active_count||0}</b><span>Critical active</span></div>
              </div>
              <div className="delivery-exception-grid">
                {deliveryExceptions.length?deliveryExceptions.map(e=><article className={`delivery-exception-card severity-${e.severity||'medium'}`} key={e.id}>
                  <div className="delivery-exception-top"><div><span className="delivery-exception-type">{String(e.exception_type||'EXCEPTION').replaceAll('_',' ')}</span><h4>{e.title||'Delivery exception'}</h4></div><span className={`delivery-exception-state state-${String(e.status||'OPEN').toLowerCase()}`}>{e.status}</span></div>
                  <div className="delivery-exception-meta"><span><b>Order</b>{e.order_number||e.order_id||'—'}</span><span><b>Vendor</b>{e.business_name||e.vendor_code||'—'}</span><span><b>AWB</b>{e.awb_code||'—'}</span><span><b>Courier status</b>{e.raw_status||e.tracking_status||'—'}</span><span><b>Age</b>{Number(e.age_hours||0)}h {e.sla_overdue&&<em className="sla-overdue">SLA overdue</em>}</span><span><b>Last action</b>{e.resolution_action?String(e.resolution_action).replaceAll('_',' '):'—'}</span></div>
                  <textarea placeholder="Admin resolution note..." value={deliveryExceptionNotes[e.id]||''} onChange={ev=>setDeliveryExceptionNotes(v=>({...v,[e.id]:ev.target.value}))}/>
                  {e.status!=='RESOLVED'&&<div className="delivery-workflow-actions">
                    <button onClick={()=>saveDeliveryExceptionWorkflow(e.id,'CUSTOMER_CONTACTED')} disabled={deliveryExceptionBusy}>Customer contacted</button>
                    <button onClick={()=>saveDeliveryExceptionWorkflow(e.id,'VENDOR_CONTACTED')} disabled={deliveryExceptionBusy}>Vendor contacted</button>
                    <button onClick={()=>saveDeliveryExceptionWorkflow(e.id,'COURIER_ESCALATED')} disabled={deliveryExceptionBusy}>Courier escalated</button>
                    <button onClick={()=>saveDeliveryExceptionWorkflow(e.id,'REATTEMPT_REQUESTED')} disabled={deliveryExceptionBusy}>Reattempt requested</button>
                    <button onClick={()=>saveDeliveryExceptionWorkflow(e.id,'RTO_RECOMMENDED')} disabled={deliveryExceptionBusy}>RTO recommended</button>
                  </div>}
                  <div className="delivery-exception-actions">{e.status==='OPEN'&&<button onClick={()=>updateDeliveryException(e.id,'acknowledge')} disabled={deliveryExceptionBusy}>Acknowledge</button>}{e.status!=='RESOLVED'&&<button onClick={()=>updateDeliveryException(e.id,'resolve')} disabled={deliveryExceptionBusy}>Resolve</button>}{e.status==='RESOLVED'&&<button onClick={()=>updateDeliveryException(e.id,'reopen')} disabled={deliveryExceptionBusy}>Reopen</button>}<button onClick={()=>loadDeliveryExceptionTimeline(e.id)} disabled={deliveryExceptionBusy}>Timeline</button></div>
                  {e.resolution_note&&<small className="delivery-exception-resolution">Last note: {e.resolution_note}</small>}
                  {deliveryExceptionTimelineOpen===e.id&&<div className="delivery-exception-timeline">
                    {(deliveryExceptionTimeline[e.id]||[]).length?(deliveryExceptionTimeline[e.id]||[]).map(t=><div key={t.id}><b>{String(t.action_type||'').replaceAll('_',' ')}</b><span>{t.created_at?new Date(t.created_at).toLocaleString():'—'} · {t.actor||'Admin'}</span>{t.note&&<small>{t.note}</small>}</div>):<small>No timeline activity yet.</small>}
                  </div>}
                </article>):<div className="logistics-admin-empty">Load delivery exceptions to view NDR/RTO/courier issues.</div>}
              </div>
            </section>

            <section className="panel shiprocket-webhook-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">SHIPROCKET AUTO-SYNC</span>
                  <h3>Webhook activity</h3>
                  <p>Live Shiprocket callbacks that automatically synchronize HOWDI Delivery across Admin, Vendor and Customer.</p>
                </div>
                <div className="webhook-panel-actions">
                  <button className="secondary" onClick={loadShiprocketWebhookEvents} disabled={shiprocketWebhookLoading}>
                    {shiprocketWebhookLoading?'Loading…':'Load webhook activity'}
                  </button>
                  <button className="secondary" onClick={retryPendingShiprocketWebhooks} disabled={shiprocketWebhookLoading}>
                    Reconcile pending
                  </button>
                </div>
              </div>

              <div className="webhook-health-row">
                <div className="webhook-health-card">
                  <span className="webhook-health-dot"></span>
                  <div><b>Auto-sync endpoint</b><small>/api/webhooks/shiprocket</small></div>
                </div>
                <div className="webhook-health-card">
                  <b>{shiprocketWebhookEvents.filter(e=>e.processed).length}</b>
                  <small>Processed events</small>
                </div>
                <div className="webhook-health-card">
                  <b>{shiprocketWebhookEvents.filter(e=>!e.processed).length}</b>
                  <small>Stored / pending</small>
                </div>
                <div className="webhook-health-card">
                  <b>{shiprocketWebhookLastLoaded?shiprocketWebhookLastLoaded.toLocaleTimeString():'—'}</b>
                  <small>Last loaded</small>
                </div>
              </div>

              <div className="webhook-events-scroll">
                <table className="webhook-events-table">
                  <thead>
                    <tr><th>Received</th><th>Order / AWB</th><th>Shiprocket status</th><th>HOWDI status</th><th>Result</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {shiprocketWebhookEvents.length?shiprocketWebhookEvents.map(e=><tr key={e.id}>
                      <td>{e.received_at?new Date(e.received_at).toLocaleString():'—'}</td>
                      <td>
                        <b>{e.order_ref||'—'}</b>
                        <small>{e.awb_code?`AWB: ${e.awb_code}`:(e.shipment_id?`Shipment: ${e.shipment_id}`:'No reference')}</small>
                      </td>
                      <td><span className="webhook-status-pill">{String(e.raw_status||'unknown').replaceAll('_',' ')}</span></td>
                      <td><span className="webhook-status-pill howdi">{String(e.mapped_status||'not mapped').replaceAll('_',' ')}</span></td>
                      <td>
                        <span className={e.processed?'webhook-result-ok':'webhook-result-pending'}>
                          {e.processed?'✓ Synchronized':'Stored'}
                        </span>
                        {e.processing_note&&<small>{e.processing_note}</small>}
                      </td>
                      <td>
                        <button
                          className="webhook-retry-btn"
                          disabled={shiprocketWebhookLoading}
                          onClick={()=>retryShiprocketWebhookEvent(e.id)}>
                          {e.processed?'Re-run':'Retry'}
                        </button>
                      </td>
                    </tr>):<tr><td colSpan="6" className="logistics-admin-empty">Click “Load webhook activity” to view Shiprocket auto-sync events.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel logistics-admin-table-wrap">
              <div className="panel-head"><div><span className="eyebrow">SHIPMENT QUEUE</span><h3>{logisticsShipments.length} shipment(s)</h3></div></div>
              <div className="logistics-admin-scroll">
                <table className="logistics-admin-table">
                  <thead><tr><th>Order</th><th>Vendor</th><th>Delivery</th><th>Status</th><th>Courier / AWB</th><th>Customer</th><th>Exception</th><th>Operations</th></tr></thead>
                  <tbody>
                    {logisticsShipments.length?logisticsShipments.map(s=><tr key={s.id}>
                      <td><b>{s.order_number}</b><small>{s.item_count} item(s)</small></td>
                      <td><b>{s.vendor_name||'HOWDI'}</b><small>{s.vendor_code||''}</small></td>
                      <td>{String(s.delivery_method||'pending').replaceAll('_',' ')}</td>
                      <td><span className="logistics-status-pill">{String(s.status||'pending').replaceAll('_',' ')}</span>{s.tracking_status&&<small>Track: {String(s.tracking_status).replaceAll('_',' ')}</small>}</td>
                      <td><b>{s.courier_name||'—'}</b><small>{s.awb_code||'No AWB'}</small></td>
                      <td><b>{s.delivery_name||'—'}</b><small>{[s.delivery_city,s.delivery_state,s.delivery_pincode].filter(Boolean).join(', ')}</small></td>
                      <td>{s.logistics_error?<span className="logistics-error-text">{s.logistics_error}</span>:<span className="logistics-ok-text">No exception</span>}</td>
                      <td>
                        <div className="logistics-admin-actions">
                          {s.awb_code&&<button className="secondary" disabled={Boolean(logisticsActionBusy)} onClick={()=>runLogisticsAction(s.id,'track')}>{logisticsActionBusy===`${s.id}:track`?'Tracking…':'Refresh tracking'}</button>}
                          {s.logistics_error&&<button className="secondary" disabled={Boolean(logisticsActionBusy)} onClick={()=>runLogisticsAction(s.id,'clear-error')}>Clear error</button>}
                          <input placeholder="Admin note" value={logisticsNoteDraft[s.id]??s.admin_note??''} onChange={e=>setLogisticsNoteDraft({...logisticsNoteDraft,[s.id]:e.target.value})}/>
                          <button className="secondary" disabled={Boolean(logisticsActionBusy)} onClick={()=>saveLogisticsNote(s.id)}>{logisticsActionBusy===`${s.id}:note`?'Saving…':'Save note'}</button>
                        </div>
                      </td>
                    </tr>):<tr><td colSpan="8" className="logistics-admin-empty">Click “Refresh logistics” to load live PostgreSQL shipments.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {tab==='orders' && (
          <div className="page">
            <section className="orders-hero">
              <div><span className="eyebrow">HOWDI ORDER CONTROL</span><h2>One place for every order journey.</h2><p>Live PostgreSQL control for customer orders, vendor/HOWDI dispatch ownership, Shiprocket shipment state, payment and fulfilment progress.</p></div>
              <div className="orders-hero-actions"><button className="secondary" onClick={loadOrdersLive} disabled={ordersLoading}>{ordersLoading?'Refreshing…':'↻ Refresh PostgreSQL'}</button><button className="primary" onClick={addDemoOrder}>＋ Test workflow</button></div>
            </section>
            <section className="order-metrics">
              <div className="order-metric"><span>🧾</span><div><small>Total orders</small><strong>{orderStats.total}</strong></div></div>
              <div className="order-metric"><span>⚙️</span><div><small>Needs action</small><strong>{orderStats.action}</strong></div></div>
              <div className="order-metric"><span>🚚</span><div><small>In delivery</small><strong>{orderStats.shipped}</strong></div></div>
              <div className="order-metric"><span>✓</span><div><small>Delivered</small><strong>{orderStats.delivered}</strong></div></div>
            </section>
            <section className="orders-workspace">
              <section className="panel orders-list-panel">
                <div className="list-head orders-list-head"><div><span className="eyebrow">ORDER QUEUE</span><h3>{filteredOrders.length} of {orders.length} orders</h3></div><div className="orders-filters"><select value={orderStatusFilter} onChange={e=>setOrderStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Payment pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="packed">Packed</option><option value="shipped">Shipped</option><option value="out_for_delivery">Out for delivery</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option><option value="returned">Returned</option><option value="refunded">Refunded</option></select><input className="search" placeholder="Order, HOWDI ID or customer..." value={orderSearch} onChange={e=>setOrderSearch(e.target.value)}/></div></div>
                <div className="orders-table">
                  {filteredOrders.map(order=>{
                    const itemCount=Array.isArray(order.items)?order.items.reduce((sum,item)=>sum+Number(item.qty||1),0):0;
                    return <article className={`order-item ${selectedOrder?.id===order.id?'selected':''}`} key={order.id} onClick={()=>setSelectedOrder(order)}>
                      <div className="order-number"><strong>{order.orderNumber || order.id}</strong><span>{new Date(order.createdAt||Date.now()).toLocaleString('en-IN')}</span></div>
                      <div className="order-customer"><strong>{order.customerName||'Customer'}</strong><span>{order.howdiId||order.customerEmail||'HOWDI customer'}</span></div>
                      <div className="order-summary"><b>{formatOrderAmount(order.total)}</b><span>{itemCount} item{itemCount===1?'':'s'} · {order.paymentStatus||'payment unknown'}</span></div>
                      <span className={`order-status ${orderStatusClass(order.status)}`}>{orderStatusLabel(order.status)}</span>
                      <button className="order-open" onClick={(e)=>{e.stopPropagation();setSelectedOrder(order)}}>View</button>
                    </article>
                  })}
                  {filteredOrders.length===0&&<div className="empty-state">🧾 {orders.length?'No orders match your current filters.':'No orders yet. Customer checkout orders will appear here automatically when checkout is connected.'}</div>}
                </div>
              </section>
              <aside className="panel order-detail-panel">
                {!selectedOrder ? <div className="order-empty"><div>🧾</div><strong>Select an order</strong><span>Choose any order from the queue to review payment, customer, items and fulfilment status.</span></div> : <>
                  <div className="order-detail-head"><div><span className="eyebrow">ORDER DETAIL</span><h3>{selectedOrder.orderNumber||selectedOrder.id}</h3><span className={`order-status ${orderStatusClass(selectedOrder.status)}`}>{orderStatusLabel(selectedOrder.status)}</span></div><button onClick={()=>setSelectedOrder(null)}>×</button></div>
                  <div className="order-detail-section"><small>CUSTOMER</small><strong>{selectedOrder.customerName||'Customer'}</strong><span>{selectedOrder.howdiId||'No HOWDI ID'} · {selectedOrder.customerEmail||selectedOrder.customerPhone||'No contact available'}</span></div>
                  <div className="order-detail-section"><small>PAYMENT</small><strong>{formatOrderAmount(selectedOrder.total)}</strong><span>{selectedOrder.paymentStatus||'Unknown'} · {selectedOrder.paymentMethod||'Payment method pending'}</span></div>
                  <div className="order-detail-section"><small>ITEMS</small><div className="order-detail-items">{(selectedOrder.items||[]).map((item,index)=><div key={`${item.name||'item'}-${index}`}><span>{item.name||'Product'}{item.variant?` · ${item.variant}`:''}</span><b>×{item.qty||1}</b></div>)}</div></div>
                  <div className="order-detail-section"><small>DELIVERY</small><strong>{selectedOrder.shippingAddress?.name||selectedOrder.customerName||'Address pending'}</strong><span>{[selectedOrder.shippingAddress?.city,selectedOrder.shippingAddress?.state,selectedOrder.shippingAddress?.pincode].filter(Boolean).join(', ') || 'Shipping address will be available after checkout.'}</span></div>
                  <div className="order-flow"><small>FULFILMENT UPDATE</small><select value={selectedOrder.status||'confirmed'} onChange={e=>updateOrderStatus(selectedOrder,e.target.value)}><option value="pending">Payment pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="packed">Packed</option><option value="shipped">Shipped</option><option value="out_for_delivery">Out for delivery</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option><option value="returned">Returned</option><option value="refunded">Refunded</option></select><p>Every status change is kept with the order record in this phase. Backend audit history will be connected with the order API.</p></div>
                </>}
              </aside>
            </section>
          </div>
        )}


        {tab==='hpay' && (
          <div className="page hpay-admin-page">
            {hpayError&&<div className="notice error">HPay API: {hpayError}</div>}
            {hpayLoading&&<div className="notice">Loading live HPay PostgreSQL data…</div>}
            <section className="hpay-admin-hero"><div><span className="eyebrow">₹ HOWDI PAY OPERATIONS</span><h2>HPay Control Tower</h2><p>Live PostgreSQL operations for transactions, requests, payment identities, risk and platform controls.</p><div className="hpay-admin-hero-badges"><span>PostgreSQL live</span><span>API connected</span><span>Provider-ready</span></div></div><div className="hpay-admin-health"><small>HPAY STATUS</small><strong>{hpaySettings.enabled?'Operational':'Paused'}</strong><span>Controlled from the HPay backend settings.</span><button className={hpaySettings.enabled?'pause':'resume'} onClick={()=>saveHpaySettings({...hpaySettings,enabled:!hpaySettings.enabled})}>{hpaySettings.enabled?'Pause HPay':'Resume HPay'}</button></div></section>
            <section className="hpay-admin-kpis">
              <article><span>₹</span><div><small>Processed volume</small><b>{formatOrderAmount(hpayStats.volume)}</b><em>PostgreSQL records</em></div></article>
              <article><span>✓</span><div><small>Successful</small><b>{hpayStats.success}</b><em>Completed payments</em></div></article>
              <article><span>◷</span><div><small>Pending / processing</small><b>{hpayStats.pending}</b><em>Awaiting provider state</em></div></article>
              <article className={hpayStats.failed?'attention':''}><span>!</span><div><small>Failed</small><b>{hpayStats.failed}</b><em>Payment failures</em></div></article>
              <article><span>↩</span><div><small>Refunded</small><b>{formatOrderAmount(hpayStats.refunds)}</b><em>Refund records</em></div></article>
              <article className={hpayStats.risk?'attention':''}><span>⌾</span><div><small>Risk alerts</small><b>{hpayStats.risk}</b><em>Open risk events</em></div></article>
            </section>
            <div className="hpay-smart-nav">
              <div className="hpay-smart-primary">
                {[
                  ['overview','Overview'],
                  ['participant360','Participant 360'],
                  ['identities','People & Businesses'],
                  ['commercial','Agreements'],
                  ['settlements','Earnings & Settlements'],
                  ['payouts','Payouts'],
                  ['reconciliation','Reconciliation'],
                  ['exceptions','Exceptions'],
                  ['adjustments','Adjustments'],
                  ['financeclose','Finance Close'],
                  ['statements','Statements'],
                  ['learnearn','Learn & Earn']
                ].map(([id,label])=><button key={id} className={hpaySection===id?'active':''} onClick={()=>{setHpaySection(id);setSelectedHpay(null);setHpayMoreOpen(false)}}>{label}</button>)}
                <div className="hpay-more-wrap">
                  <button className={['transactions','requests','billpay','risk','settings'].includes(hpaySection)?'active':''} onClick={()=>setHpayMoreOpen(v=>!v)}>More <span>⌄</span></button>
                  {hpayMoreOpen&&<div className="hpay-more-menu">
                    {[
                      ['transactions','Transactions'],
                      ['requests','Requests'],
                      ['identities','HPay IDs'],
                      ['billpay','Bill Pay'],
                      ['risk','Risk & Limits'],
                      ['settings','Settings']
                    ].map(([id,label])=><button key={id} onClick={()=>{setHpaySection(id);setSelectedHpay(null);setHpayMoreOpen(false)}}>{label}</button>)}
                  </div>}
                </div>
              </div>
              <button className="hpay-smart-refresh" onClick={()=>{loadHPay();loadUniversalHpay()}}>↻ Refresh HPay</button>
            </div>
            {hpaySection==='overview'&&<section className="hpay-smart-overview panel">
              <div className="hpay-smart-overview-head">
                <div><span className="eyebrow">SMART FINANCE VIEW</span><h3>What needs attention?</h3><p>Start here. Move from participant → agreement → earning → settlement → payout without jumping across technical modules.</p></div>
              </div>
              <div className="hpay-smart-flow">
                <button onClick={()=>setHpaySection('identities')}><span>01</span><b>People & Businesses</b><small>Vendors, Workers and future programs</small></button>
                <i>→</i>
                <button onClick={()=>setHpaySection('commercial')}><span>02</span><b>Agreements</b><small>Commercial and earning rules</small></button>
                <i>→</i>
                <button onClick={()=>setHpaySection('settlements')}><span>03</span><b>Earnings</b><small>What HOWDI owes</small></button>
                <i>→</i>
                <button onClick={()=>setHpaySection('settlements')}><span>04</span><b>Settlements</b><small>Eligible and approved</small></button>
                <i>→</i>
                <button onClick={()=>setHpaySection('payouts')}><span>05</span><b>Payouts</b><small>Final payment control</small></button>
                <i>→</i>
                <button onClick={()=>setHpaySection('reconciliation')}><span>06</span><b>Reconcile</b><small>Audit every finance link</small></button>
                <i>→</i>
                <button onClick={()=>setHpaySection('financeclose')}><span>07</span><b>Finance Close</b><small>Prepare → Review → Approve → Close</small></button>
              </div>
              <div className="hpay-smart-cards">
                <article><small>Money processed</small><b>{formatOrderAmount(Number(hpayOverview?.moneyProcessed||hpayStats.volume||0))}</b><span>Across enabled HPay programs</span></article>
                <article><small>HOWDI revenue</small><b>{formatOrderAmount(Number(hpayOverview?.howdiRevenue||0))}</b><span>Recorded HPay revenue</span></article>
                <article><small>Pending payouts</small><b>{formatOrderAmount(Number(hpayOverview?.pendingPayouts||0))}</b><span>Needs settlement/payout flow</span></article>
                <article><small>Paid</small><b>{formatOrderAmount(Number(hpayOverview?.paid||0))}</b><span>Completed settlement ledger</span></article>
              </div>
              <div className="hpay-smart-programs">
                {(hpayOverview?.programs||[]).map(p=><button key={p.program_key} onClick={()=>setHpaySection(p.program_key==='vendor_commerce'?'commercial':p.program_key==='worker_services'?'settlements':p.program_key==='learn_earn'?'learnearn':'identities')}>
                  <span className={`hpay-program-dot ${p.is_operational?'live':'foundation'}`}></span>
                  <div><b>{p.program_name}</b><small>{Number(p.participants||0)} participant(s)</small></div>
                  <em>{p.is_operational?'LIVE':'FOUNDATION'}</em>
                </button>)}
              </div>
            </section>}
            {hpaySection==='transactions'&&<section className="panel hpay-admin-list"><div className="list-head"><div><span className="eyebrow">LIVE MONEY MOVEMENT</span><h3>{filteredHpay.length} transactions</h3></div><div className="hpay-admin-filters"><select value={hpayStatusFilter} onChange={e=>setHpayStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="success">Success</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select><input className="search" value={hpaySearch} onChange={e=>setHpaySearch(e.target.value)} placeholder="Transaction, user, HOWDI ID…"/></div></div><div className="hpay-admin-table">{filteredHpay.map(item=><article key={item.transaction_id}><div className="hpay-type">₹</div><div className="hpay-tx-main"><strong>{item.sender_name||item.receiver_name||'HOWDI user'}</strong><span>{item.transaction_id}</span><small>{item.receiver_name||item.receiver_hpay_id||'—'}</small></div><div className="hpay-method"><b>{item.method||'HPAY'}</b><span>{item.provider_reference||item.client_reference||'—'}</span></div><div className="hpay-amount"><b>{formatOrderAmount(Number(item.amount||0))}</b><span className={`hpay-status ${String(item.status||'').toLowerCase()}`}>{String(item.status||'').toLowerCase()}</span></div><div className={`hpay-risk ${String(item.risk_level||'low').toLowerCase()}`}>{String(item.risk_level||'low').toLowerCase()}</div><button onClick={()=>setSelectedHpay(item)}>View</button></article>)}</div>{!filteredHpay.length&&!hpayLoading&&<div className="empty-state hpay-empty-state"><span>₹</span><div><strong>No HPay transactions yet</strong><small>Live PostgreSQL transactions will appear here after the first provider-backed HPay payment.</small></div></div>}</section>}
            {hpaySection==='requests'&&<section className="panel hpay-admin-section"><div className="panel-head"><div><span className="eyebrow">LIVE PAYMENT REQUESTS</span><h3>{hpayRequests.length} requests</h3><p>Payment requests stored in PostgreSQL.</p></div></div><div className="hpay-request-grid">{hpayRequests.map(x=><article key={x.request_id}><div className="hpay-type request">↙</div><div><b>{x.requester_name||x.requester_hpay_id}</b><small>{x.request_id}</small><span>{x.note||'Money request'}</span></div><strong>{formatOrderAmount(Number(x.amount||0))}</strong><em className={`hpay-status ${String(x.status||'pending').toLowerCase()}`}>{String(x.status||'pending').toLowerCase()}</em></article>)}</div></section>}
            {hpaySection==='identities'&&<section className="panel hpay-admin-section"><div className="panel-head"><div><span className="eyebrow">LIVE HPAY IDENTITIES</span><h3>{hpayUsers.length} HPay accounts</h3><p>HOWDI identity remains master; HPay ID is the payment alias.</p></div></div><div className="hpay-identity-grid">{hpayUsers.map(u=><article key={u.hpay_id}><div className="hpay-user-avatar">{String(u.full_name||'H').slice(0,1)}</div><div className="hpay-user-copy"><b>{u.full_name||'HOWDI user'}</b><span>{u.hpay_id}</span><small>{u.howdi_id||''}</small></div><div><small>KYC</small><b>{u.kyc_status}</b></div><div><small>BANK</small><b>{u.linked_banks||0} linked</b></div><div><small>QR</small><b>{u.qr_enabled?'Active':'Off'}</b></div><span className={`hpay-status ${String(u.status||'').toLowerCase()==='active'?'success':'pending'}`}>{String(u.status||'').toLowerCase()}</span></article>)}</div></section>}
            {hpaySection==='commercial'&&<section className="panel commercial-admin-section">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">VENDOR COMMERCIAL GOVERNANCE</span>
                  <h3>Commercial Terms & Negotiation</h3>
                  <p>HOWDI Admin proposes terms. Vendor accepts, counters or rejects. Until acceptance, the vendor's currently accepted plan remains unchanged.</p>
                </div>
                <button className="secondary" onClick={loadCommercialVendors} disabled={commercialBusy}>{commercialBusy?'Loading…':'Load vendors'}</button>
              </div>


              <div className="negotiation-center">
                <div className="negotiation-center-head">
                  <div><span className="eyebrow">COMMERCIAL OPERATIONS</span><h3>Negotiation Center</h3><p>One place to see accepted, waiting, countered, rejected and expired vendor proposals.</p></div>
                  <button className="secondary" onClick={loadNegotiationCenter} disabled={negotiationLoading}>{negotiationLoading?'Loading…':'Refresh negotiation center'}</button>
                </div>

                <div className="negotiation-summary">
                  {[
                    ['ALL','Total vendors',negotiationSummary.totalVendors],
                    ['FREE','Free plan',negotiationSummary.freePlan],
                    ['OFFERED','Offer sent',negotiationSummary.offered],
                    ['COUNTERED','Counter proposal',negotiationSummary.countered],
                    ['ACCEPTED','Accepted',negotiationSummary.accepted],
                    ['REJECTED','Rejected',negotiationSummary.rejected],
                    ['EXPIRED','Expired',negotiationSummary.expired]
                  ].map(([key,label,value])=><button key={key} className={negotiationFilter===key?'active':''} onClick={()=>setNegotiationFilter(key)}><span>{label}</span><b>{value||0}</b></button>)}
                </div>

                <div className="negotiation-tools">
                  <input value={negotiationSearch} onChange={e=>setNegotiationSearch(e.target.value)} placeholder="Search vendor, Vendor ID, city…"/>
                  <small>Accepted terms are immutable for historical orders. Re-proposals always create a new agreement version.</small>
                </div>

                <div className="negotiation-table-wrap">
                  <table className="negotiation-table">
                    <thead><tr><th>Vendor</th><th>Current plan</th><th>Latest proposal</th><th>Status</th><th>Commission</th><th>Free days</th><th>Last action</th><th>Action</th></tr></thead>
                    <tbody>
                      {negotiationRows.filter(r=>{
                        const q=negotiationSearch.trim().toLowerCase();
                        const matchesSearch=!q||[r.business_name,r.vendor_code,r.city,r.state].some(v=>String(v||'').toLowerCase().includes(q));
                        const matchesFilter=negotiationFilter==='ALL'?true:
                          negotiationFilter==='FREE'?Number(r.active_commission_value||0)===0:
                          r.latest_status===negotiationFilter;
                        return matchesSearch&&matchesFilter;
                      }).map(r=><tr key={r.vendor_profile_id}>
                        <td><b>{r.business_name}</b><small>{r.vendor_code} · {r.city||'—'} · {r.product_count||0} products</small></td>
                        <td><b>{r.active_agreement_name||'Founding Free Plan'}</b><small>V{r.active_version||1} · {Number(r.active_commission_value||0)}{r.active_commission_type==='flat'?' ₹':'%'}</small></td>
                        <td><b>{r.latest_agreement_name||'—'}</b><small>V{r.latest_version||'—'}</small></td>
                        <td><span className={`neg-status ${String(r.latest_status||'FREE').toLowerCase()}`}>{r.latest_status||'FREE'}</span></td>
                        <td>{Number(r.latest_commission_value||0)}{r.latest_commission_type==='flat'?' ₹':'%'}</td>
                        <td>{r.latest_free_commission_days||0}</td>
                        <td><small>{r.latest_status==='COUNTERED'?r.vendor_counter_note||'Vendor sent counter':r.latest_status==='ACCEPTED'?'Vendor accepted':r.latest_status==='REJECTED'?'Vendor rejected':r.latest_status==='OFFERED'?'Waiting for vendor':'Current plan'}</small></td>
                        <td><div className="neg-actions"><button type="button" onClick={()=>openNegotiationDetail(r.vendor_profile_id)}>View</button>{['COUNTERED','REJECTED','EXPIRED','ACCEPTED'].includes(r.latest_status)&&<button type="button" className="secondary" onClick={()=>prepareRequote(r)}>Re-propose</button>}</div></td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>

                {negotiationDetail&&<div className="negotiation-detail">
                  <div className="negotiation-detail-head"><div><span className="eyebrow">VENDOR NEGOTIATION HISTORY</span><h4>{negotiationDetail.vendor?.business_name}</h4><small>{negotiationDetail.vendor?.vendor_code} · {negotiationDetail.vendor?.city||'—'}</small></div><button className="secondary" onClick={()=>setNegotiationDetail(null)}>Close</button></div>
                  <div className="negotiation-version-grid">
                    {(negotiationDetail.agreements||[]).map(a=><article key={a.id}>
                      <div><b>V{a.version} · {a.agreement_name}</b><span className={`neg-status ${String(a.status||'').toLowerCase()}`}>{a.status}</span></div>
                      <p>{Number(a.commission_value||0)}{a.commission_type==='flat'?' ₹ flat':'% commission'} · {a.free_commission_days||0} free days · {a.settlement_cycle_days||7}-day settlement</p>
                      {a.vendor_counter_note&&<blockquote><b>Vendor counter:</b> {a.vendor_counter_note}</blockquote>}
                      {a.admin_note&&<small><b>HOWDI:</b> {a.admin_note}</small>}
                      <small>{a.accepted_at?`Accepted ${new Date(a.accepted_at).toLocaleString()}`:a.offered_at?`Offered ${new Date(a.offered_at).toLocaleString()}`:''}</small>
                    </article>)}
                  </div>
                  <div className="negotiation-event-list">
                    <h4>Complete timeline</h4>
                    {(negotiationDetail.events||[]).map(e=><div key={e.id}><span className="neg-event-dot"></span><div><b>{String(e.event_type||'').replaceAll('_',' ')}</b><small>V{e.version} · {e.actor_type} · {new Date(e.created_at).toLocaleString()}</small>{e.message&&<p>{e.message}</p>}</div></div>)}
                  </div>
                </div>}
              </div>




              <div className="universal-hpay-center"><div className="negotiation-center-head"><div>
              <section className="hpay-integrity-center">
                <div className="hpay-integrity-head">
                  <div><span className="eyebrow">V18.5 · PAYMENT ↔ HPAY INTEGRITY</span><h3>Finance Integrity Gate</h3><p>Processed customer refunds are checked against Vendor settlements and payouts. HOWDI never silently rewrites settled money or closed finance periods.</p></div>
                  <button className="secondary" onClick={syncPaymentIntegrity} disabled={paymentIntegrityBusy}>{paymentIntegrityBusy?'Checking…':'Run integrity check'}</button>
                </div>
                <div className="hpay-integrity-kpis">
                  <article><small>Open</small><b>{paymentIntegrity?.summary?.open_cases||0}</b></article>
                  <article><small>In review</small><b>{paymentIntegrity?.summary?.review_cases||0}</b></article>
                  <article><small>Critical</small><b>{paymentIntegrity?.summary?.critical_open||0}</b></article>
                  <article><small>Open exposure</small><b>{formatOrderAmount(paymentIntegrity?.summary?.open_exposure||0)}</b></article>
                </div>
                {(paymentIntegrity?.cases||[]).filter(x=>x.status!=='RESOLVED').slice(0,5).map(item=><article className="hpay-integrity-case" key={item.id}>
                  <div><strong>{item.case_code}</strong><span>{String(item.case_type||'').replaceAll('_',' ')} · {item.order_number||'Order'} · {item.business_name||item.vendor_code||'Vendor'}</span></div>
                  <div><b>{formatOrderAmount(item.exposure_amount)}</b><em className={`integrity-severity ${String(item.severity||'').toLowerCase()}`}>{item.severity}</em></div>
                  <div className="hpay-integrity-actions">
                    {item.status==='OPEN'&&<button onClick={()=>paymentIntegrityAction(item,'review')}>Review</button>}
                    <button className="secondary" onClick={()=>paymentIntegrityAction(item,'assign')}>Assign</button>
                    {item.status!=='RESOLVED'&&<button className="secondary" onClick={()=>paymentIntegrityAction(item,'resolve')}>Resolve with evidence</button>}
                  </div>
                </article>)}
                {!paymentIntegrityBusy&&!(paymentIntegrity?.cases||[]).some(x=>x.status!=='RESOLVED')&&<div className="hpay-integrity-clear">✓ No unresolved Payment ↔ HPay finance integrity cases.</div>}
              </section>
<span className="eyebrow">HOWDI HPAY</span><h3>Unified Finance Center</h3><p>One simple finance home for Vendors, Workers, Learn & Earn and future HOWDI programs.</p></div><button onClick={loadUniversalHpay} disabled={hpayBusy}>{hpayBusy?'Loading…':'Refresh HPay'}</button></div>{hpayOverview&&<><div className="hpay-top-cards">{[['Money processed',hpayOverview.moneyProcessed],['HOWDI revenue',hpayOverview.howdiRevenue],['Pending payouts',hpayOverview.pendingPayouts],['Paid',hpayOverview.paid]].map(([k,v])=><article key={k}><span>{k}</span><b>₹{Number(v||0).toFixed(2)}</b></article>)}</div><div className="hpay-program-cards">{(hpayOverview.programs||[]).map(p=><article key={p.id}><span className="eyebrow">{p.is_operational?'LIVE':'FOUNDATION'}</span><h4>{p.program_name}</h4><small>{p.participants||0} participants</small></article>)}</div></>}<div className="hpay-account-list">{hpayAccounts.map(a=><article key={`${a.id}-${a.program_key}`}><span><b>{a.display_name}</b><small>{a.hpay_account_id} · {a.howdi_id||'HOWDI ID pending'}</small></span><span><small>Program</small><b>{a.program_name}</b></span><span><small>Pending</small><b>₹{Number(a.pending||0).toFixed(2)}</b></span><span><small>Paid</small><b>₹{Number(a.paid||0).toFixed(2)}</b></span></article>)}</div><div className="hpay-principle"><b>Universal HPay rule</b><span>New HOWDI service = new HPay Program, not a new payment system.</span><span>Earn → HOWDI charges → Payable → Settlement → Payout → Record.</span></div></div>







              {hpaySection==='exceptions'&&<div className="hpay-exception-center">
                <div className="negotiation-center-head">
                  <div>
                    <span className="eyebrow">V17.7 · FINANCE EXCEPTION CONTROL</span>
                    <h3>Reconciliation Exception Cases</h3>
                    <p>Assign, investigate and document reconciliation exceptions without silently changing any financial amount.</p>
                  </div>
                  <div className="worker-hpay-actions">
                    <button className="secondary" onClick={loadHpayExceptionControl} disabled={hpayExceptionBusy}>{hpayExceptionBusy?'Loading…':'Load exceptions'}</button>
                    <button onClick={()=>setHpaySection('reconciliation')}>Run fresh reconciliation</button>
                  </div>
                </div>

                <div className="hpay-exception-warning">
                  <b>Resolution notes do not bypass reconciliation.</b>
                  <span>If the underlying mismatch still exists, a fresh reconciliation will create the exception again and Finance Close will remain protected.</span>
                </div>

                <div className="hpay-exception-summary">
                  <article><small>Open</small><b>{Number(hpayExceptionControl?.summary?.open||0)}</b></article>
                  <article><small>Acknowledged</small><b>{Number(hpayExceptionControl?.summary?.acknowledged||0)}</b></article>
                  <article><small>In review</small><b>{Number(hpayExceptionControl?.summary?.in_review||0)}</b></article>
                  <article><small>Resolved</small><b>{Number(hpayExceptionControl?.summary?.resolved||0)}</b></article>
                  <article className="critical"><small>Unresolved critical</small><b>{Number(hpayExceptionControl?.summary?.unresolved_critical||0)}</b></article>
                  <article><small>Unresolved warning</small><b>{Number(hpayExceptionControl?.summary?.unresolved_warning||0)}</b></article>
                </div>

                <div className="hpay-exception-tools">
                  <label>Assign to
                    <input value={hpayExceptionAssignee} onChange={e=>setHpayExceptionAssignee(e.target.value)} placeholder="Finance Team / person"/>
                  </label>
                  <label>Investigation / resolution note
                    <input value={hpayExceptionNote} onChange={e=>setHpayExceptionNote(e.target.value)} placeholder="Add evidence or resolution note"/>
                  </label>
                </div>

                <section className="hpay-exception-list-section">
                  <div className="learn-earn-section-title">
                    <div><span>LATEST RECONCILIATION</span><h4>{hpayExceptionControl?.latestRun?.run_number||'No reconciliation run yet'}</h4></div>
                  </div>

                  {(hpayExceptionControl?.issues||[]).length?<div className="hpay-exception-list">
                    {hpayExceptionControl.issues.map(i=><article key={i.id}>
                      <em className={String(i.severity||'').toLowerCase()}>{i.severity}</em>
                      <span className="issue-main"><b>{i.issue_type}</b><small>{i.program_key} · {i.entity_type} · {i.entity_reference||'—'}</small></span>
                      <span><small>Status</small><b>{i.status}</b></span>
                      <span><small>Assigned</small><b>{i.assigned_to||'—'}</b></span>
                      <span><small>Expected / Actual</small><b>{i.expected_amount==null?'—':`₹${Number(i.expected_amount).toFixed(2)}`} / {i.actual_amount==null?'—':`₹${Number(i.actual_amount).toFixed(2)}`}</b></span>
                      <div className="hpay-exception-actions">
                        {['OPEN','REOPENED'].includes(i.status)&&<button onClick={()=>actHpayException(i.id,'acknowledge')} disabled={hpayExceptionBusy}>Acknowledge</button>}
                        {['OPEN','REOPENED','ACKNOWLEDGED'].includes(i.status)&&<button onClick={()=>actHpayException(i.id,'review')} disabled={hpayExceptionBusy}>Review</button>}
                        {i.status!=='RESOLVED'&&<button onClick={()=>actHpayException(i.id,'assign')} disabled={hpayExceptionBusy}>Assign</button>}
                        {i.status!=='RESOLVED'&&<button onClick={()=>actHpayException(i.id,'resolve')} disabled={hpayExceptionBusy}>Resolve</button>}
                        {i.status==='RESOLVED'&&<button onClick={()=>actHpayException(i.id,'reopen')} disabled={hpayExceptionBusy}>Reopen</button>}
                        <button className="secondary" onClick={()=>actHpayException(i.id,'note')} disabled={hpayExceptionBusy}>Add note</button>
                      </div>
                      {i.resolution_note&&<p className="hpay-exception-resolution"><b>Resolution:</b> {i.resolution_note}</p>}
                    </article>)}
                  </div>:<div className="hpay-recon-clean"><span>✓</span><div><b>No exceptions in the latest reconciliation</b><p>Run reconciliation again after any finance changes to confirm.</p></div></div>}
                </section>

                <section className="hpay-exception-events">
                  <div className="learn-earn-section-title"><div><span>AUDIT TRAIL</span><h4>Recent exception activity</h4></div></div>
                  {(hpayExceptionControl?.recentEvents||[]).length?<div className="hpay-exception-event-list">
                    {hpayExceptionControl.recentEvents.map(e=><article key={e.id}>
                      <span><b>{e.event_type}</b><small>{new Date(e.created_at).toLocaleString()}</small></span>
                      <span><small>Issue</small><b>{e.issue_type}</b></span>
                      <span><small>Status</small><b>{e.from_status||'—'} → {e.to_status||'—'}</b></span>
                      <span><small>Actor</small><b>{e.actor||'—'}</b></span>
                    </article>)}
                  </div>:<p className="empty-inline">No exception workflow events yet.</p>}
                </section>
              </div>}




              {hpaySection==='participant360'&&<div className="hpay-participant-center">
                <div className="negotiation-center-head">
                  <div>
                    <span className="eyebrow">V18.0 · UNIVERSAL HPAY IDENTITY</span>
                    <h3>Participant 360</h3>
                    <p>One finance identity view for Vendors, Workers, Learners and future HOWDI earning programs.</p>
                  </div>
                  <button className="secondary" onClick={()=>loadHpayParticipants()} disabled={hpayParticipantBusy}>{hpayParticipantBusy?'Loading…':'Load participants'}</button>
                </div>

                <div className="hpay-participant-summary">
                  <article><small>Total identities</small><b>{Number(hpayParticipants?.summary?.total||0)}</b></article>
                  <article><small>Vendors</small><b>{Number(hpayParticipants?.summary?.vendors||0)}</b></article>
                  <article><small>Workers</small><b>{Number(hpayParticipants?.summary?.workers||0)}</b></article>
                  <article><small>Learners</small><b>{Number(hpayParticipants?.summary?.learners||0)}</b></article>
                  <article><small>Active</small><b>{Number(hpayParticipants?.summary?.active||0)}</b></article>
                </div>

                <div className="hpay-participant-search">
                  <input
                    value={hpayParticipantSearch}
                    onChange={e=>setHpayParticipantSearch(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')loadHpayParticipants(e.currentTarget.value)}}
                    placeholder="Search HPay ID, HOWDI ID, name, Vendor, Worker, Learner…"
                  />
                  <button onClick={()=>loadHpayParticipants()} disabled={hpayParticipantBusy}>Search</button>
                  <button className="secondary" onClick={()=>{setHpayParticipantSearch('');loadHpayParticipants('')}}>Clear</button>
                </div>

                <div className="hpay-participant-layout">
                  <section className="hpay-participant-list-section">
                    <div className="learn-earn-section-title"><div><span>PEOPLE & BUSINESSES</span><h4>Universal earning identities</h4></div></div>
                    {(hpayParticipants?.rows||[]).length?<div className="hpay-participant-list">
                      {hpayParticipants.rows.map(p=><button key={p.id} className={hpayParticipant360?.account?.id===p.id?'active':''} onClick={()=>openHpayParticipant360(p.id)}>
                        <span className={`participant-type ${String(p.owner_type||'').toLowerCase()}`}>{p.owner_type}</span>
                        <span className="participant-main"><b>{p.display_name||p.hpay_account_id}</b><small>{p.hpay_account_id} · {p.howdi_id||'No HOWDI ID'}</small></span>
                        <span className="participant-programs">{(p.programs||[]).map(x=><em key={`${p.id}-${x.program_key}`}>{x.program_name}</em>)}</span>
                        <strong>{p.status}</strong>
                      </button>)}
                    </div>:<p className="empty-inline">Load participants to begin.</p>}
                  </section>

                  <section className="hpay-participant-detail">
                    {hpayParticipant360?.account?<>
                      <div className="participant-identity-card">
                        <div>
                          <span className={`participant-type ${String(hpayParticipant360.account.owner_type||'').toLowerCase()}`}>{hpayParticipant360.account.owner_type}</span>
                          <h4>{hpayParticipant360.account.display_name||'HOWDI Participant'}</h4>
                          <p>{hpayParticipant360.account.hpay_account_id} · {hpayParticipant360.account.howdi_id||'No HOWDI ID'}</p>
                        </div>
                        <b>{hpayParticipant360.account.status}</b>
                      </div>

                      <div className="participant-money-kpis">
                        <article><small>Gross</small><b>₹{Number(hpayParticipant360.totals?.gross||0).toFixed(2)}</b></article>
                        <article><small>HOWDI fees</small><b>₹{Number(hpayParticipant360.totals?.howdi_fee||0).toFixed(2)}</b></article>
                        <article><small>Deductions</small><b>₹{Number(hpayParticipant360.totals?.deductions||0).toFixed(2)}</b></article>
                        <article><small>Net</small><b>₹{Number(hpayParticipant360.totals?.net||0).toFixed(2)}</b></article>
                        <article><small>Paid</small><b>₹{Number(hpayParticipant360.totals?.paid||0).toFixed(2)}</b></article>
                        <article><small>Outstanding</small><b>₹{Number(hpayParticipant360.totals?.outstanding||0).toFixed(2)}</b></article>
                      </div>

                      <section className="participant-statement-builder">
                        <div className="participant-statement-head">
                          <div>
                            <span>V18.1 · PARTICIPANT STATEMENT</span>
                            <h4>Generate filtered HPay statement</h4>
                            <p>Choose a date range and program, then export this participant’s finance history as CSV.</p>
                          </div>
                          <button onClick={downloadParticipantStatementCsv}>Download CSV</button>
                        </div>

                        <div className="participant-statement-filters">
                          <label>From
                            <input type="date" value={hpayParticipantStatementFrom} onChange={e=>setHpayParticipantStatementFrom(e.target.value)}/>
                          </label>
                          <label>To
                            <input type="date" value={hpayParticipantStatementTo} onChange={e=>setHpayParticipantStatementTo(e.target.value)}/>
                          </label>
                          <label>Program
                            <select value={hpayParticipantStatementProgram} onChange={e=>setHpayParticipantStatementProgram(e.target.value)}>
                              <option value="all">All programs</option>
                              {(hpayParticipant360.memberships||[]).map(m=><option key={m.program_key} value={m.program_key}>{m.program_name}</option>)}
                              {hpayParticipant360.account.owner_type==='VENDOR'&&!(hpayParticipant360.memberships||[]).some(m=>m.program_key==='vendor_commerce')&&<option value="vendor_commerce">Vendor Commerce</option>}
                            </select>
                          </label>
                          <button className="secondary" onClick={()=>{
                            setHpayParticipantStatementFrom('');
                            setHpayParticipantStatementTo('');
                            setHpayParticipantStatementProgram('all');
                          }}>Reset</button>
                        </div>

                        {(()=>{
                          const t=participantStatementTotals();
                          const f=getFilteredParticipantStatement();
                          return <div className="participant-statement-preview">
                            <article><small>Gross</small><b>₹{t.gross.toFixed(2)}</b></article>
                            <article><small>HOWDI fees</small><b>₹{t.howdiFee.toFixed(2)}</b></article>
                            <article><small>Deductions</small><b>₹{t.deductions.toFixed(2)}</b></article>
                            <article><small>Net</small><b>₹{t.net.toFixed(2)}</b></article>
                            <article><small>Paid</small><b>₹{t.paid.toFixed(2)}</b></article>
                            <article><small>Outstanding</small><b>₹{t.outstanding.toFixed(2)}</b></article>
                            <article className="records"><small>Statement records</small><b>{f.earnings.length+f.settlements.length+f.vendorSettlements.length+f.ledger.length}</b></article>
                          </div>;
                        })()}
                      </section>

                      <div className="participant-detail-grid">
                        <section>
                          <div className="learn-earn-section-title"><div><span>PROGRAMS</span><h4>Memberships</h4></div></div>
                          {(hpayParticipant360.memberships||[]).length?<div className="participant-mini-list">
                            {hpayParticipant360.memberships.map(m=><article key={m.id}>
                              <span><b>{m.program_name}</b><small>{m.program_key}</small></span>
                              <em>{m.status}</em>
                            </article>)}
                          </div>:<p className="empty-inline">No HPay program memberships.</p>}
                        </section>

                        <section>
                          <div className="learn-earn-section-title"><div><span>AGREEMENTS</span><h4>Commercial / earning terms</h4></div></div>
                          {(hpayParticipant360.agreements||[]).length?<div className="participant-mini-list">
                            {hpayParticipant360.agreements.map(a=><article key={a.id}>
                              <span><b>{a.agreement_name}</b><small>{a.program_name} · Version {a.version}</small></span>
                              <em>{a.status}</em>
                            </article>)}
                          </div>:<p className="empty-inline">No universal agreement records.</p>}
                        </section>
                      </div>

                      <section className="participant-table-section">
                        <div className="learn-earn-section-title"><div><span>EARNINGS</span><h4>Universal earnings ledger</h4></div></div>
                        {(hpayParticipant360.earnings||[]).length?<div className="participant-table">
                          <div className="head"><span>Reference</span><span>Program</span><span>Gross</span><span>Fee</span><span>Net</span><span>Status</span></div>
                          {hpayParticipant360.earnings.map(e=><div className="row" key={e.id}>
                            <span><b>{e.earning_number}</b><small>{e.source_type}</small></span>
                            <span>{e.program_name}</span>
                            <span>₹{Number(e.gross_amount||0).toFixed(2)}</span>
                            <span>₹{Number(e.howdi_fee_amount||0).toFixed(2)}</span>
                            <span><b>₹{Number(e.net_payable_amount||0).toFixed(2)}</b></span>
                            <span>{e.status}</span>
                          </div>)}
                        </div>:<p className="empty-inline">No universal earnings.</p>}
                      </section>

                      <section className="participant-table-section">
                        <div className="learn-earn-section-title"><div><span>SETTLEMENTS & PAYOUTS</span><h4>Universal settlement history</h4></div></div>
                        {(hpayParticipant360.settlements||[]).length?<div className="participant-table settlements">
                          <div className="head"><span>Settlement</span><span>Program</span><span>Net</span><span>Status</span><span>Payout batch</span><span>Reference</span></div>
                          {hpayParticipant360.settlements.map(s=><div className="row" key={s.id}>
                            <span><b>{s.settlement_number}</b><small>{new Date(s.created_at).toLocaleDateString()}</small></span>
                            <span>{s.program_name}</span>
                            <span><b>₹{Number(s.net_payable_amount||0).toFixed(2)}</b></span>
                            <span>{s.status}</span>
                            <span>{s.batch_number||'—'}</span>
                            <span>{s.payment_reference||s.payout_reference||'—'}</span>
                          </div>)}
                        </div>:<p className="empty-inline">No universal settlements.</p>}
                      </section>

                      {hpayParticipant360.account.owner_type==='VENDOR'&&<section className="participant-table-section">
                        <div className="learn-earn-section-title"><div><span>VENDOR COMMERCE</span><h4>Mature Vendor settlement engine</h4></div></div>
                        {(hpayParticipant360.vendorSettlements||[]).length?<div className="participant-table vendor">
                          <div className="head"><span>Settlement</span><span>Order</span><span>Gross</span><span>Commission</span><span>Net</span><span>Status</span></div>
                          {hpayParticipant360.vendorSettlements.map(s=><div className="row" key={s.id}>
                            <span><b>{s.settlement_number}</b><small>{new Date(s.created_at).toLocaleDateString()}</small></span>
                            <span>{s.order_id||'—'}</span>
                            <span>₹{Number(s.gross_amount||0).toFixed(2)}</span>
                            <span>₹{Number(s.commission_amount||0).toFixed(2)}</span>
                            <span><b>₹{Number(s.net_payable_amount||0).toFixed(2)}</b></span>
                            <span>{s.status}</span>
                          </div>)}
                        </div>:<p className="empty-inline">No Vendor Commerce settlements.</p>}
                      </section>}

                      <section className="participant-ledger-section">
                        <div className="learn-earn-section-title"><div><span>LEDGER</span><h4>Universal finance entries</h4></div></div>
                        {(hpayParticipant360.ledger||[]).length?<div className="participant-mini-list ledger">
                          {hpayParticipant360.ledger.map(l=><article key={l.id}>
                            <span><b>{l.entry_type}</b><small>{l.program_name} · {l.source_type} · {new Date(l.created_at).toLocaleString()}</small></span>
                            <strong>{l.direction==='CREDIT'?'+':'-'}₹{Math.abs(Number(l.amount||0)).toFixed(2)}</strong>
                          </article>)}
                        </div>:<p className="empty-inline">No universal ledger entries.</p>}
                      </section>
                    </>:<div className="participant-empty">
                      <span>👤</span>
                      <div><b>Select a participant</b><p>Choose a Vendor, Worker or Learner to open the complete HPay 360 finance view.</p></div>
                    </div>}
                  </section>
                </div>

                <div className="participant-hardening-note">
                  <b>V18.0 Learn & Earn hardening included</b>
                  <span>Reward-rule table initialization now follows the learning-course schema, and one completed enrollment can receive only one cash reward even if an admin later creates a new reward-rule version.</span>
                </div>
              </div>}

              {hpaySection==='statements'&&<div className="hpay-statement-center">
                <div className="negotiation-center-head">
                  <div>
                    <span className="eyebrow">V17.9 · FINANCE REPORTING</span>
                    <h3>Finance Statements & Audit Pack</h3>
                    <p>One period-level statement combining Vendor Commerce, Worker Services, Learn & Earn, adjustments, reconciliation and sign-off evidence.</p>
                  </div>
                  <div className="worker-hpay-actions">
                    <button className="secondary" onClick={()=>loadFinanceStatementPack()} disabled={financeStatementBusy}>{financeStatementBusy?'Loading…':'Load statement'}</button>
                    <button onClick={downloadFinanceStatementCsv} disabled={financeStatementBusy||!financeStatementPack?.close}>Download CSV</button>
                  </div>
                </div>

                <div className="hpay-statement-select">
                  <label>Finance period
                    <select value={financeStatementCloseId} onChange={e=>{setFinanceStatementCloseId(e.target.value);loadFinanceStatementPack(e.target.value)}}>
                      <option value="">Latest available close</option>
                      {(financeStatementPack?.periods||[]).map(p=><option key={p.id} value={p.id}>
                        {p.close_number} · {p.period_start} → {p.period_end} · {p.status}
                      </option>)}
                    </select>
                  </label>
                </div>

                {financeStatementPack?.close?<>
                  <div className="hpay-statement-header">
                    <div>
                      <span>FINANCE CLOSE</span>
                      <h4>{financeStatementPack.close.close_number}</h4>
                      <p>{financeStatementPack.close.period_start} → {financeStatementPack.close.period_end}</p>
                    </div>
                    <div>
                      <span className={`statement-lock ${financeStatementPack.controls?.periodLocked?'locked':'open'}`}>{financeStatementPack.controls?.periodLocked?'🔒 CLOSED & LOCKED':'OPEN / IN PROGRESS'}</span>
                      <small>Reconciliation: {financeStatementPack.close.reconciliation_status||'—'}</small>
                    </div>
                  </div>

                  <div className="hpay-statement-kpis">
                    <article><small>Vendor</small><b>₹{Number(financeStatementPack.close.vendor_total||0).toFixed(2)}</b></article>
                    <article><small>Worker</small><b>₹{Number(financeStatementPack.close.worker_total||0).toFixed(2)}</b></article>
                    <article><small>Learn & Earn</small><b>₹{Number(financeStatementPack.close.learn_earn_total||0).toFixed(2)}</b></article>
                    <article className="total"><small>Total finance value</small><b>₹{Number(financeStatementPack.close.total_finance_value||0).toFixed(2)}</b></article>
                    <article><small>Critical issues</small><b>{Number(financeStatementPack.controls?.criticalIssueCount||0)}</b></article>
                    <article><small>Warnings</small><b>{Number(financeStatementPack.controls?.warningIssueCount||0)}</b></article>
                  </div>

                  <section className="hpay-statement-section">
                    <div className="learn-earn-section-title"><div><span>PROGRAM STATEMENT</span><h4>Commerce + Services + Rewards</h4></div></div>
                    <div className="hpay-statement-table">
                      <div className="head">
                        <span>Program</span><span>Gross</span><span>HOWDI Fee</span><span>Deductions</span><span>Adjustments</span><span>Net</span><span>Paid</span><span>Unpaid</span>
                      </div>
                      {(financeStatementPack.programSummary||[]).map(p=><div className="row" key={p.program_key}>
                        <span><b>{p.program_name}</b><small>{p.program_key}</small></span>
                        <span>₹{Number(p.gross||0).toFixed(2)}</span>
                        <span>₹{Number(p.howdi_fee||0).toFixed(2)}</span>
                        <span>₹{Number(p.other_deductions||0).toFixed(2)}</span>
                        <span>₹{Number((p.posted_adjustment||0)+(p.settlement_adjustment||0)).toFixed(2)}</span>
                        <span><b>₹{Number(p.net||0).toFixed(2)}</b></span>
                        <span>₹{Number(p.paid||0).toFixed(2)}</span>
                        <span>₹{Number(p.unpaid||0).toFixed(2)}</span>
                      </div>)}
                    </div>
                  </section>

                  <div className="hpay-statement-grid">
                    <section>
                      <div className="learn-earn-section-title"><div><span>POSTED ADJUSTMENTS</span><h4>Corrections included in this period</h4></div></div>
                      {(financeStatementPack.adjustmentsPosted||[]).length?<div className="hpay-statement-list">
                        {financeStatementPack.adjustmentsPosted.map(a=><article key={a.id}>
                          <span><b>{a.adjustment_number}</b><small>{a.program_key} · {a.adjustment_type}</small></span>
                          <span><small>Amount</small><b>₹{Number(a.amount||0).toFixed(2)}</b></span>
                          <span><small>Reason</small><b>{a.reason}</b></span>
                        </article>)}
                      </div>:<p className="empty-inline">No posted adjustments in this period.</p>}
                    </section>

                    <section>
                      <div className="learn-earn-section-title"><div><span>SIGN-OFF</span><h4>Finance close audit trail</h4></div></div>
                      {(financeStatementPack.closeEvents||[]).length?<div className="hpay-statement-list">
                        {financeStatementPack.closeEvents.map(e=><article key={e.id}>
                          <span><b>{e.event_type}</b><small>{new Date(e.created_at).toLocaleString()}</small></span>
                          <span><small>Status</small><b>{e.from_status||'—'} → {e.to_status||'—'}</b></span>
                          <span><small>Actor</small><b>{e.actor||'—'}</b></span>
                        </article>)}
                      </div>:<p className="empty-inline">No sign-off events recorded.</p>}
                    </section>
                  </div>

                  <section className="hpay-statement-section">
                    <div className="learn-earn-section-title">
                      <div><span>RECONCILIATION EVIDENCE</span><h4>{financeStatementPack.close.reconciliation_run_number||'No linked reconciliation'}</h4></div>
                    </div>
                    {(financeStatementPack.reconciliationIssues||[]).length?<div className="hpay-statement-issues">
                      {financeStatementPack.reconciliationIssues.map(i=><article key={i.id}>
                        <em className={String(i.severity||'').toLowerCase()}>{i.severity}</em>
                        <span><b>{i.issue_type}</b><small>{i.program_key} · {i.entity_reference||'—'}</small></span>
                        <span><small>Expected / Actual</small><b>{i.expected_amount==null?'—':`₹${Number(i.expected_amount).toFixed(2)}`} / {i.actual_amount==null?'—':`₹${Number(i.actual_amount).toFixed(2)}`}</b></span>
                        <span><small>Status</small><b>{i.status}</b></span>
                      </article>)}
                    </div>:<div className="hpay-recon-clean"><span>✓</span><div><b>No reconciliation exceptions linked to this finance close</b><p>The selected statement has no recorded reconciliation issue rows.</p></div></div>}
                  </section>

                  <div className="hpay-statement-controls">
                    <article className={financeStatementPack.controls?.reconciliationComplete?'ok':'wait'}><span>{financeStatementPack.controls?.reconciliationComplete?'✓':'•'}</span><div><b>Reconciliation snapshot</b><small>{financeStatementPack.controls?.reconciliationComplete?'Available':'Pending'}</small></div></article>
                    <article className={financeStatementPack.controls?.signoffComplete?'ok':'wait'}><span>{financeStatementPack.controls?.signoffComplete?'✓':'•'}</span><div><b>Finance sign-off</b><small>{financeStatementPack.controls?.signoffComplete?'Closed':'Not closed'}</small></div></article>
                    <article className={financeStatementPack.controls?.periodLocked?'ok':'wait'}><span>{financeStatementPack.controls?.periodLocked?'✓':'•'}</span><div><b>Historical lock</b><small>{financeStatementPack.controls?.periodLocked?'Immutable':'Not locked yet'}</small></div></article>
                  </div>
                </>:<div className="hpay-statement-empty">
                  <span>📄</span><div><b>No finance statement yet</b><p>Create a Finance Close first, then return here to generate the statement pack.</p></div>
                </div>}
              </div>}

              {hpaySection==='adjustments'&&<div className="hpay-adjustment-center">
                <div className="negotiation-center-head">
                  <div>
                    <span className="eyebrow">V17.8 · CLOSED PERIOD PROTECTION</span>
                    <h3>Finance Adjustment Journal</h3>
                    <p>Closed periods stay immutable. Corrections are posted as new, separately approved adjustments into the current open period.</p>
                  </div>
                  <button className="secondary" onClick={loadHpayAdjustmentControl} disabled={hpayAdjustmentBusy}>{hpayAdjustmentBusy?'Loading…':'Load adjustment journal'}</button>
                </div>

                <div className="hpay-adjustment-lock">
                  <span>🔒</span>
                  <div><b>Never rewrite a CLOSED finance period</b><small>V17.8 preserves historical Vendor, Worker and Learn & Earn finance snapshots. Corrections create a forward adjustment instead.</small></div>
                </div>

                <div className="hpay-adjustment-summary">
                  <article><small>Draft</small><b>{Number(hpayAdjustmentControl?.summary?.draft||0)}</b></article>
                  <article><small>Reviewed</small><b>{Number(hpayAdjustmentControl?.summary?.reviewed||0)}</b></article>
                  <article><small>Approved</small><b>{Number(hpayAdjustmentControl?.summary?.approved||0)}</b></article>
                  <article><small>Posted</small><b>{Number(hpayAdjustmentControl?.summary?.posted||0)}</b></article>
                  <article><small>Posted credits</small><b>₹{Number(hpayAdjustmentControl?.summary?.posted_positive||0).toFixed(2)}</b></article>
                  <article><small>Posted debits</small><b>₹{Math.abs(Number(hpayAdjustmentControl?.summary?.posted_negative||0)).toFixed(2)}</b></article>
                </div>

                <section className="hpay-adjustment-create">
                  <div className="learn-earn-section-title"><div><span>NEW ADJUSTMENT</span><h4>Reference the original closed period</h4></div></div>
                  <div className="hpay-adjustment-form">
                    <label>Closed period
                      <select value={hpayAdjustmentForm.original_close_id} onChange={e=>setHpayAdjustmentForm(v=>({...v,original_close_id:e.target.value}))}>
                        <option value="">Choose closed finance period</option>
                        {(hpayAdjustmentControl?.closedPeriods||[]).map(c=><option key={c.id} value={c.id}>{c.close_number} · {c.period_start} → {c.period_end}</option>)}
                      </select>
                    </label>
                    <label>Program
                      <select value={hpayAdjustmentForm.program_key} onChange={e=>setHpayAdjustmentForm(v=>({...v,program_key:e.target.value}))}>
                        <option value="vendor_commerce">Vendor Commerce</option>
                        <option value="worker_services">Worker Services</option>
                        <option value="learn_earn">Learn & Earn</option>
                      </select>
                    </label>
                    <label>Adjustment type
                      <select value={hpayAdjustmentForm.adjustment_type} onChange={e=>setHpayAdjustmentForm(v=>({...v,adjustment_type:e.target.value}))}>
                        <option value="CORRECTION">Correction</option>
                        <option value="REVERSAL">Reversal</option>
                        <option value="MANUAL_CREDIT">Manual Credit</option>
                        <option value="MANUAL_DEBIT">Manual Debit</option>
                        <option value="ROUNDING">Rounding</option>
                      </select>
                    </label>
                    <label>Amount ₹
                      <input type="number" step="0.01" value={hpayAdjustmentForm.amount} onChange={e=>setHpayAdjustmentForm(v=>({...v,amount:e.target.value}))} placeholder="Positive credit / negative debit"/>
                    </label>
                    <label>Source reference
                      <input value={hpayAdjustmentForm.source_reference} onChange={e=>setHpayAdjustmentForm(v=>({...v,source_reference:e.target.value}))} placeholder="Order / settlement / ticket reference"/>
                    </label>
                    <label className="reason">Reason
                      <input value={hpayAdjustmentForm.reason} onChange={e=>setHpayAdjustmentForm(v=>({...v,reason:e.target.value}))} placeholder="Mandatory reason for adjustment"/>
                    </label>
                    <button onClick={createHpayAdjustment} disabled={hpayAdjustmentBusy}>Create draft adjustment</button>
                  </div>
                </section>

                <section className="hpay-adjustment-list-section">
                  <div className="learn-earn-section-title"><div><span>ADJUSTMENT WORKFLOW</span><h4>DRAFT → REVIEWED → APPROVED → POSTED</h4></div></div>
                  <div className="hpay-adjustment-note-box">
                    <input value={hpayAdjustmentNote} onChange={e=>setHpayAdjustmentNote(e.target.value)} placeholder="Optional workflow note"/>
                  </div>
                  {(hpayAdjustmentControl?.adjustments||[]).length?<div className="hpay-adjustment-list">
                    {hpayAdjustmentControl.adjustments.map(a=><article key={a.id}>
                      <span><b>{a.adjustment_number}</b><small>{a.original_close_number||'—'} · {a.program_key}</small></span>
                      <span><small>Type</small><b>{a.adjustment_type}</b></span>
                      <span><small>Amount</small><b className={Number(a.amount)>=0?'credit':'debit'}>{Number(a.amount)>=0?'+':'-'}₹{Math.abs(Number(a.amount||0)).toFixed(2)}</b></span>
                      <span><small>Status</small><b>{a.status}</b></span>
                      <span><small>Posting period</small><b>{a.posting_period_start?`${a.posting_period_start} → ${a.posting_period_end}`:'—'}</b></span>
                      <div className="hpay-adjustment-actions">
                        {a.status==='DRAFT'&&<button onClick={()=>actHpayAdjustment(a.id,'review')} disabled={hpayAdjustmentBusy}>Review</button>}
                        {a.status==='REVIEWED'&&<button onClick={()=>actHpayAdjustment(a.id,'approve')} disabled={hpayAdjustmentBusy}>Approve</button>}
                        {a.status==='APPROVED'&&<button onClick={()=>actHpayAdjustment(a.id,'post')} disabled={hpayAdjustmentBusy}>Post adjustment</button>}
                        {['DRAFT','REVIEWED'].includes(a.status)&&<button className="secondary" onClick={()=>actHpayAdjustment(a.id,'cancel')} disabled={hpayAdjustmentBusy}>Cancel</button>}
                      </div>
                      <p><b>Reason:</b> {a.reason}</p>
                    </article>)}
                  </div>:<p className="empty-inline">No finance adjustments created yet.</p>}
                </section>

                <section className="hpay-adjustment-events">
                  <div className="learn-earn-section-title"><div><span>AUDIT TRAIL</span><h4>Recent adjustment activity</h4></div></div>
                  {(hpayAdjustmentControl?.recentEvents||[]).length?<div className="hpay-adjustment-event-list">
                    {hpayAdjustmentControl.recentEvents.map(e=><article key={e.id}>
                      <span><b>{e.event_type}</b><small>{new Date(e.created_at).toLocaleString()}</small></span>
                      <span><small>Adjustment</small><b>{e.adjustment_number}</b></span>
                      <span><small>Status</small><b>{e.from_status||'—'} → {e.to_status||'—'}</b></span>
                      <span><small>Amount</small><b>₹{Number(e.amount||0).toFixed(2)}</b></span>
                    </article>)}
                  </div>:<p className="empty-inline">No adjustment events yet.</p>}
                </section>
              </div>}

              {hpaySection==='financeclose'&&<div className="hpay-finance-close-center">
                <div className="negotiation-center-head">
                  <div>
                    <span className="eyebrow">V17.6 · FINANCE GOVERNANCE</span>
                    <h3>Finance Close & Sign-off</h3>
                    <p>Create a period close only after HOWDI has a reconciliation snapshot. Critical reconciliation issues block Prepare.</p>
                  </div>
                  <button className="secondary" onClick={loadFinanceClose} disabled={financeCloseBusy}>{financeCloseBusy?'Loading…':'Load finance closes'}</button>
                </div>

                <div className="finance-close-flow">
                  <span>DRAFT</span><i>→</i><span>PREPARED</span><i>→</i><span>REVIEWED</span><i>→</i><span>APPROVED</span><i>→</i><span>CLOSED</span>
                </div>

                <div className="finance-close-create">
                  <label>Period start
                    <input type="date" value={financeCloseForm.period_start} onChange={e=>setFinanceCloseForm(v=>({...v,period_start:e.target.value}))}/>
                  </label>
                  <label>Period end
                    <input type="date" value={financeCloseForm.period_end} onChange={e=>setFinanceCloseForm(v=>({...v,period_end:e.target.value}))}/>
                  </label>
                  <label>Admin note
                    <input value={financeCloseForm.note} onChange={e=>setFinanceCloseForm(v=>({...v,note:e.target.value}))} placeholder="Example: August 2026 finance close"/>
                  </label>
                  <button onClick={createFinanceClose} disabled={financeCloseBusy}>Create finance close</button>
                </div>

                <div className="finance-close-summary">
                  <article><small>Draft</small><b>{Number(financeClose?.summary?.draft||0)}</b></article>
                  <article><small>Prepared</small><b>{Number(financeClose?.summary?.prepared||0)}</b></article>
                  <article><small>Reviewed</small><b>{Number(financeClose?.summary?.reviewed||0)}</b></article>
                  <article><small>Approved</small><b>{Number(financeClose?.summary?.approved||0)}</b></article>
                  <article><small>Closed</small><b>{Number(financeClose?.summary?.closed||0)}</b></article>
                </div>

                <section className="finance-close-latest">
                  <div className="learn-earn-section-title">
                    <div><span>LATEST CLOSE</span><h4>{financeClose?.latest?.close_number||'No finance close created yet'}</h4></div>
                  </div>

                  {financeClose?.latest?<div className="finance-close-card">
                    <div className="finance-close-status-row">
                      <span className={`finance-close-status ${String(financeClose.latest.status||'').toLowerCase()}`}>{financeClose.latest.status}</span>
                      <b>{financeClose.latest.period_start} → {financeClose.latest.period_end}</b>
                      <small>Reconciliation: {financeClose.latest.reconciliation_status||'—'} · {financeClose.latest.reconciliation_run_number||'—'}</small>
                    </div>

                    <div className="finance-close-money">
                      <article><small>Vendor</small><b>₹{Number(financeClose.latest.vendor_total||0).toFixed(2)}</b></article>
                      <article><small>Worker</small><b>₹{Number(financeClose.latest.worker_total||0).toFixed(2)}</b></article>
                      <article><small>Learn & Earn</small><b>₹{Number(financeClose.latest.learn_earn_total||0).toFixed(2)}</b></article>
                      <article><small>Total</small><b>₹{Number(financeClose.latest.total_finance_value||0).toFixed(2)}</b></article>
                    </div>

                    <div className="finance-close-issues">
                      <span><b>{Number(financeClose.latest.critical_issue_count||0)}</b> critical</span>
                      <span><b>{Number(financeClose.latest.warning_issue_count||0)}</b> warning</span>
                    </div>

                    <div className="finance-close-actions">
                      {financeClose.latest.status==='DRAFT'&&<button onClick={()=>actFinanceClose(financeClose.latest.id,'prepare')} disabled={financeCloseBusy||Number(financeClose.latest.critical_issue_count||0)>0}>Prepare</button>}
                      {financeClose.latest.status==='PREPARED'&&<button onClick={()=>actFinanceClose(financeClose.latest.id,'review')} disabled={financeCloseBusy}>Review</button>}
                      {financeClose.latest.status==='REVIEWED'&&<button onClick={()=>actFinanceClose(financeClose.latest.id,'approve')} disabled={financeCloseBusy}>Approve</button>}
                      {financeClose.latest.status==='APPROVED'&&<button onClick={()=>actFinanceClose(financeClose.latest.id,'close')} disabled={financeCloseBusy}>Close period</button>}
                      {Number(financeClose.latest.critical_issue_count||0)>0&&<button className="secondary" onClick={()=>setHpaySection('reconciliation')}>Open reconciliation</button>}
                    </div>
                  </div>:<p className="empty-inline">Create a finance close above. HOWDI will automatically run reconciliation and snapshot the totals.</p>}
                </section>

                <div className="finance-close-grid">
                  <section>
                    <div className="learn-earn-section-title"><div><span>CLOSE HISTORY</span><h4>Finance periods</h4></div></div>
                    <div className="finance-close-list">
                      {(financeClose?.closes||[]).length?financeClose.closes.map(c=><article key={c.id}>
                        <span><b>{c.close_number}</b><small>{c.period_start} → {c.period_end}</small></span>
                        <span><small>Total</small><b>₹{Number(c.total_finance_value||0).toFixed(2)}</b></span>
                        <em className={String(c.status||'').toLowerCase()}>{c.status}</em>
                      </article>):<p className="empty-inline">No finance close history.</p>}
                    </div>
                  </section>

                  <section>
                    <div className="learn-earn-section-title"><div><span>SIGN-OFF AUDIT</span><h4>Latest close events</h4></div></div>
                    <div className="finance-close-events">
                      {(financeClose?.events||[]).length?financeClose.events.map(e=><article key={e.id}>
                        <span><b>{e.event_type}</b><small>{new Date(e.created_at).toLocaleString()}</small></span>
                        <span><small>Status</small><b>{e.from_status||'—'} → {e.to_status||'—'}</b></span>
                        <span><small>Actor</small><b>{e.actor||'—'}</b></span>
                      </article>):<p className="empty-inline">No sign-off events yet.</p>}
                    </div>
                  </section>
                </div>

                <div className="finance-close-note">
                  <b>Close protection</b>
                  <span>Creating a close runs reconciliation automatically. A DRAFT with critical issues cannot move to PREPARED. Closing is a governance sign-off only; it does not move money or rewrite historical settlements.</span>
                </div>
              </div>}

              {hpaySection==='reconciliation'&&<div className="hpay-recon-center">
                <div className="negotiation-center-head">
                  <div>
                    <span className="eyebrow">V17.5 · FINANCE INTEGRITY</span>
                    <h3>HPay Reconciliation & Audit</h3>
                    <p>Verify Vendor Commerce, Worker Services and Learn & Earn ledgers before finance closes or payouts are trusted.</p>
                  </div>
                  <div className="worker-hpay-actions">
                    <button className="secondary" onClick={loadHpayReconciliation} disabled={hpayReconBusy}>{hpayReconBusy?'Loading…':'Load latest'}</button>
                    <button onClick={runHpayReconciliation} disabled={hpayReconBusy}>{hpayReconBusy?'Checking…':'Run reconciliation'}</button>
                  </div>
                </div>

                <div className={`hpay-recon-health ${hpayReconciliation?.latest?.status==='ATTENTION'?'attention':'healthy'}`}>
                  <div>
                    <span>{hpayReconciliation?.latest?.status==='ATTENTION'?'!':'✓'}</span>
                    <div>
                      <b>{hpayReconciliation?.latest?.status||'NOT RUN YET'}</b>
                      <small>{hpayReconciliation?.latest?.run_number||'Run reconciliation to create the first finance integrity snapshot.'}</small>
                    </div>
                  </div>
                  <em>{hpayReconciliation?.latest?.created_at?new Date(hpayReconciliation.latest.created_at).toLocaleString():'—'}</em>
                </div>

                <div className="hpay-recon-metrics">
                  <article><small>Total issues</small><b>{Number(hpayReconciliation?.latest?.summary?.totalIssues||0)}</b></article>
                  <article className="critical"><small>Critical</small><b>{Number(hpayReconciliation?.latest?.summary?.critical||0)}</b></article>
                  <article><small>Warnings</small><b>{Number(hpayReconciliation?.latest?.summary?.warning||0)}</b></article>
                  <article><small>Vendor issues</small><b>{Number(hpayReconciliation?.latest?.summary?.vendorIssues||0)}</b></article>
                  <article><small>Worker issues</small><b>{Number(hpayReconciliation?.latest?.summary?.workerIssues||0)}</b></article>
                  <article><small>Learn & Earn issues</small><b>{Number(hpayReconciliation?.latest?.summary?.learnEarnIssues||0)}</b></article>
                </div>

                <div className="hpay-recon-grid">
                  <section>
                    <div className="learn-earn-section-title"><div><span>LEDGER TOTALS</span><h4>Program money trail</h4></div></div>
                    <div className="hpay-recon-programs">
                      <article>
                        <span><b>Vendor Commerce</b><small>Existing V16 commercial settlement engine</small></span>
                        <span><small>Gross</small><b>₹{Number(hpayReconciliation?.vendorTotals?.gross||0).toFixed(2)}</b></span>
                        <span><small>Settlements</small><b>₹{Number(hpayReconciliation?.vendorTotals?.settlements||0).toFixed(2)}</b></span>
                        <span><small>Paid</small><b>₹{Number(hpayReconciliation?.vendorTotals?.paid||0).toFixed(2)}</b></span>
                      </article>
                      {(hpayReconciliation?.programTotals||[]).map(p=><article key={p.program_key}>
                        <span><b>{p.program_name}</b><small>{p.program_key}</small></span>
                        <span><small>Gross</small><b>₹{Number(p.gross||0).toFixed(2)}</b></span>
                        <span><small>Settlements</small><b>₹{Number(p.settlements||0).toFixed(2)}</b></span>
                        <span><small>Paid</small><b>₹{Number(p.paid||0).toFixed(2)}</b></span>
                      </article>)}
                    </div>
                  </section>

                  <section>
                    <div className="learn-earn-section-title"><div><span>RECENT RUNS</span><h4>Audit history</h4></div></div>
                    <div className="hpay-recon-runs">
                      {(hpayReconciliation?.recentRuns||[]).length?hpayReconciliation.recentRuns.map(r=><article key={r.id}>
                        <span><b>{r.run_number}</b><small>{new Date(r.created_at).toLocaleString()}</small></span>
                        <em className={r.status==='ATTENTION'?'attention':'completed'}>{r.status}</em>
                        <b>{r.issue_count} issue(s)</b>
                      </article>):<p className="empty-inline">No reconciliation run yet.</p>}
                    </div>
                  </section>
                </div>

                <section className="hpay-recon-issues">
                  <div className="learn-earn-section-title"><div><span>EXCEPTIONS</span><h4>Latest reconciliation issues</h4></div></div>
                  {(hpayReconciliation?.issues||[]).length?<div className="hpay-recon-issue-list">
                    {hpayReconciliation.issues.map(i=><article key={i.id}>
                      <em className={String(i.severity||'').toLowerCase()}>{i.severity}</em>
                      <span><b>{i.issue_type}</b><small>{i.program_key} · {i.entity_type}</small></span>
                      <span><small>Reference</small><b>{i.entity_reference||'—'}</b></span>
                      <span><small>Expected</small><b>{i.expected_amount==null?'—':`₹${Number(i.expected_amount).toFixed(2)}`}</b></span>
                      <span><small>Actual</small><b>{i.actual_amount==null?'—':`₹${Number(i.actual_amount).toFixed(2)}`}</b></span>
                    </article>)}
                  </div>:<div className="hpay-recon-clean"><span>✓</span><div><b>No exceptions in the latest run</b><p>Settlement amounts, payout batches and ledger links are consistent for the checks performed.</p></div></div>}
                </section>

                <div className="hpay-recon-note">
                  <b>What V17.5 checks</b>
                  <span>Settlement amount ↔ earning items · payout batch amount ↔ batch items · settled earning ↔ settlement link · paid/approved batch ↔ settlement status · Vendor payout batch totals and settlement links.</span>
                </div>
              </div>}

              {hpaySection==='payouts'&&<div className="universal-payout-center">
                <div className="negotiation-center-head">
                  <div><span className="eyebrow">V17.4 · UNIVERSAL FINANCE OPERATIONS</span><h3>Settlement & Payout Control</h3><p>One control center for Worker Services and Learn & Earn. Vendor payouts keep the proven V16.5 flow.</p></div>
                  <button className="secondary" onClick={loadUniversalPayoutControl} disabled={universalPayoutBusy}>{universalPayoutBusy?'Loading…':'↻ Load payout control'}</button>
                </div>
                <div className="universal-payout-safety"><b>Ledger control only.</b><span>Approve and Mark Paid update HOWDI finance records. No bank, UPI, or payout provider is called automatically.</span></div>
                <div className="universal-payout-summary">
                  <article><small>Universal eligible</small><b>₹{Number(universalPayoutControl?.summary?.eligible_amount||0).toFixed(2)}</b><span>{Number(universalPayoutControl?.summary?.eligible_settlements||0)} settlement(s)</span></article>
                  <article><small>Universal approved</small><b>₹{Number(universalPayoutControl?.summary?.approved_amount||0).toFixed(2)}</b><span>{Number(universalPayoutControl?.summary?.approved_settlements||0)} settlement(s)</span></article>
                  <article><small>Universal paid</small><b>₹{Number(universalPayoutControl?.summary?.paid_amount||0).toFixed(2)}</b><span>{Number(universalPayoutControl?.summary?.paid_settlements||0)} settlement(s)</span></article>
                  <article><small>Vendor eligible</small><b>₹{Number(universalPayoutControl?.vendorSummary?.eligible_amount||0).toFixed(2)}</b><span>Existing Vendor Payout Batch Control</span></article>
                </div>
                <div className="universal-payout-actions">
                  <div><span>1. Generate settlements</span><button onClick={()=>generateProgramSettlements('worker_services')} disabled={universalPayoutBusy}>Worker Services</button><button onClick={()=>generateProgramSettlements('learn_earn')} disabled={universalPayoutBusy}>Learn & Earn</button></div>
                  <div><span>2. Build payout batch</span><select value={universalPayoutProgram} onChange={e=>{setUniversalPayoutProgram(e.target.value);setSelectedUniversalSettlements([])}}><option value="worker_services">Worker Services</option><option value="learn_earn">Learn & Earn</option></select><input value={universalPayoutNote} onChange={e=>setUniversalPayoutNote(e.target.value)} placeholder="Admin note"/><button onClick={createUniversalPayoutBatch} disabled={universalPayoutBusy}>Create batch</button></div>
                </div>
                <section className="universal-payout-section">
                  <div className="learn-earn-section-title"><div><span>ELIGIBLE SETTLEMENTS</span><h4>Select settlements for the payout batch</h4></div></div>
                  <div className="universal-eligible-list">
                    {(universalPayoutControl?.eligible||[]).length?universalPayoutControl.eligible.map(s=><article key={s.id} className={universalPayoutProgram!==s.program_key?'dimmed':''}>
                      <input type="checkbox" checked={selectedUniversalSettlements.includes(Number(s.id))} disabled={universalPayoutProgram!==s.program_key} onChange={()=>toggleUniversalSettlement(Number(s.id))}/>
                      <span><b>{s.display_name}</b><small>{s.hpay_account_id}</small></span><span><small>Program</small><b>{s.program_name}</b></span><span><small>Settlement</small><b>{s.settlement_number}</b></span><span><small>Amount</small><b>₹{Number(s.net_payable_amount||0).toFixed(2)}</b></span>
                    </article>):<p className="empty-inline">No eligible universal settlements. Generate settlements after earnings become eligible.</p>}
                  </div>
                </section>
                <section className="universal-payout-section">
                  <div className="learn-earn-section-title"><div><span>PAYOUT BATCHES</span><h4>Approval and payment ledger</h4></div></div>
                  <div className="universal-payout-reference"><input value={universalPayoutReference} onChange={e=>setUniversalPayoutReference(e.target.value)} placeholder="UTR / payout reference required when marking paid"/></div>
                  <div className="universal-batch-list">
                    {(universalPayoutControl?.batches||[]).length?universalPayoutControl.batches.map(b=><article key={b.id}>
                      <span><b>{b.batch_number}</b><small>{b.program_name} · {b.settlement_count} settlement(s)</small></span><span><small>Total</small><b>₹{Number(b.total_amount||0).toFixed(2)}</b></span><span><small>Status</small><b className={`universal-payout-status ${String(b.status||'').toLowerCase()}`}>{b.status}</b></span><span><small>Reference</small><b>{b.payment_reference||'—'}</b></span><div>{b.status==='DRAFT'&&<button onClick={()=>actUniversalPayoutBatch(b.id,'approve')} disabled={universalPayoutBusy}>Approve</button>}{b.status==='APPROVED'&&<button onClick={()=>actUniversalPayoutBatch(b.id,'mark-paid')} disabled={universalPayoutBusy}>Mark paid</button>}</div>
                    </article>):<p className="empty-inline">No universal payout batches yet.</p>}
                  </div>
                </section>
                <div className="vendor-payout-bridge"><div><b>Vendor Commerce</b><span>Vendor payout processing remains on the mature V16.5 Vendor Payout Batch Control. V17.4 does not alter it.</span></div><button onClick={()=>setHpaySection('settlements')}>Open Vendor Settlements</button></div>
              </div>}

              {hpaySection==='learnearn'&&<div className="learn-earn-hpay-center">
                <div className="negotiation-center-head">
                  <div>
                    <span className="eyebrow">LEARN & EARN · V17.3</span>
                    <h3>Learning Reward Control</h3>
                    <p>A course completion creates a cash reward only when Admin has enabled a positive reward rule for that exact course.</p>
                  </div>
                  <div className="worker-hpay-actions">
                    <button className="secondary" onClick={loadLearnEarnHpay} disabled={learnEarnBusy}>{learnEarnBusy?'Loading…':'Load Learn & Earn'}</button>
                    <button onClick={syncLearnEarnHpay} disabled={learnEarnBusy}>Sync completed courses</button>
                  </div>
                </div>

                <div className="learn-earn-safety">
                  <b>No automatic cash promise.</b>
                  <span>Course completion alone does not create money. Reward must be explicitly configured and enabled by HOWDI Admin.</span>
                </div>

                <div className="learn-earn-metrics">
                  <article><small>Program</small><b>{learnEarnOverview?.program?.is_operational?'LIVE':'FOUNDATION'}</b></article>
                  <article><small>Learners</small><b>{(learnEarnOverview?.participants||[]).length}</b></article>
                  <article><small>Reward records</small><b>{Number(learnEarnOverview?.totals?.reward_count||0)}</b></article>
                  <article><small>Rewards created</small><b>₹{Number(learnEarnOverview?.totals?.rewards||0).toFixed(2)}</b></article>
                  <article><small>Pending payout</small><b>₹{Number(learnEarnOverview?.totals?.pending||0).toFixed(2)}</b></article>
                  <article><small>Paid</small><b>₹{Number(learnEarnOverview?.totals?.paid||0).toFixed(2)}</b></article>
                </div>

                <div className="learn-earn-grid">
                  <section>
                    <div className="learn-earn-section-title"><div><span>COURSE REWARD RULE</span><h4>Create new version</h4></div></div>
                    <label>Learning course
                      <select value={learnRewardForm.course_id} onChange={e=>setLearnRewardForm(v=>({...v,course_id:e.target.value}))}>
                        <option value="">Choose course</option>
                        {(learnEarnOverview?.courses||[]).map(c=><option key={c.id} value={c.id}>{c.title}{Number(c.active_reward||0)>0?` · ₹${Number(c.active_reward).toFixed(2)} active`:''}</option>)}
                      </select>
                    </label>
                    <label>Reward amount ₹
                      <input type="number" min="0" step="1" value={learnRewardForm.reward_amount} onChange={e=>setLearnRewardForm(v=>({...v,reward_amount:e.target.value}))} placeholder="Example: 100"/>
                    </label>
                    <label>Status
                      <select value={learnRewardForm.reward_status} onChange={e=>setLearnRewardForm(v=>({...v,reward_status:e.target.value}))}>
                        <option value="DISABLED">DISABLED</option>
                        <option value="ENABLED">ENABLED</option>
                      </select>
                    </label>
                    <label>Admin note
                      <textarea value={learnRewardForm.admin_note} onChange={e=>setLearnRewardForm(v=>({...v,admin_note:e.target.value}))} placeholder="Why this reward is being offered"/>
                    </label>
                    <button onClick={saveLearnRewardRule} disabled={learnEarnBusy}>Save reward version</button>
                    <small className="learn-rule-note">Enabling a new rule disables the previous enabled rule for that course. Historical rewards keep their original rule snapshot.</small>
                  </section>

                  <section>
                    <div className="learn-earn-section-title"><div><span>ACTIVE / HISTORICAL RULES</span><h4>Reward history</h4></div></div>
                    <div className="learn-rule-list">
                      {(learnEarnOverview?.rules||[]).length?(learnEarnOverview.rules.map(r=><article key={r.id}>
                        <div><b>{r.course_title}</b><small>{r.category||'Learning'} · {r.level||'All levels'}</small></div>
                        <span><small>Reward</small><b>₹{Number(r.reward_amount||0).toFixed(2)}</b></span>
                        <span><small>Version</small><b>V{r.rule_version}</b></span>
                        <em className={r.reward_status==='ENABLED'?'enabled':'disabled'}>{r.reward_status}</em>
                      </article>)):<p className="empty-inline">No reward rules configured. Learn & Earn remains FOUNDATION.</p>}
                    </div>
                  </section>
                </div>

                <div className="learn-participants">
                  <div className="learn-earn-section-title"><div><span>PEOPLE & BUSINESSES</span><h4>Learners connected to Universal HPay</h4></div></div>
                  {(learnEarnOverview?.participants||[]).length?<div className="learn-participant-list">
                    {learnEarnOverview.participants.map(p=><article key={p.id}>
                      <span><b>{p.display_name}</b><small>{p.hpay_account_id}</small></span>
                      <span><small>Enrolled</small><b>{p.enrolled_courses}</b></span>
                      <span><small>Completed</small><b>{p.completed_courses}</b></span>
                      <span><small>Earned</small><b>₹{Number(p.earned||0).toFixed(2)}</b></span>
                    </article>)}
                  </div>:<p className="empty-inline">No enrolled learners are connected yet.</p>}
                </div>
              </div>}

              <div className="worker-hpay-center">
                <div className="negotiation-center-head">
                  <div><span className="eyebrow">WORKER SERVICES · LIVE</span><h3>Worker HPay</h3><p>Only successful customer service payments become Worker earnings.</p></div>
                  <div className="worker-hpay-actions">
                    <button className="secondary" onClick={loadWorkerHpay} disabled={workerHpayBusy}>{workerHpayBusy?'Loading…':'Load workers'}</button>
                    <button onClick={generateWorkerSettlements} disabled={workerHpayBusy}>Generate eligible settlements</button>
                  </div>
                </div>
                <div className="worker-hpay-flow-admin">
                  <span>Payment SUCCESS</span><b>→</b><span>Worker earning</span><b>→</b><span>Agreement fee</span><b>→</b><span>Eligible</span><b>→</b><span>Settlement</span>
                </div>
                <div className="worker-hpay-list">
                  {workerHpayRows.length?workerHpayRows.map(w=><article key={w.id}>
                    <span><b>{w.display_name}</b><small>{w.worker_code} · {w.requested_skill||'Worker'} · {w.city||'—'}</small></span>
                    <span><small>HPay ID</small><b>{w.hpay_account_id}</b></span>
                    <span><small>On hold</small><b>₹{Number(w.hold||0).toFixed(2)}</b></span>
                    <span><small>Eligible</small><b>₹{Number(w.eligible||0).toFixed(2)}</b></span>
                    <span><small>Paid</small><b>₹{Number(w.paid||0).toFixed(2)}</b></span>
                  </article>):<p className="empty-inline">Load Worker HPay to see connected workers.</p>}
                </div>
              </div>

              <div className="payout-control-center">
                <div className="negotiation-center-head">
                  <div><span className="eyebrow">FINANCE PAYOUT CONTROL</span><h3>Vendor Payout Batches</h3><p>Group approved settlements into controlled payout batches, approve the batch, then record the bank/UTR reference after payment.</p></div>
                  <button className="secondary" onClick={loadPayoutControl} disabled={payoutBusy}>{payoutBusy?'Loading…':'Load payout control'}</button>
                </div>

                <div className="payout-control-grid">
                  <section className="payout-card">
                    <h4>Approved settlements ready for batching</h4>
                    <p>Only APPROVED settlements that are not already inside another payout batch appear here.</p>
                    <div className="payout-selection-list">
                      {eligiblePayoutSettlements.length?eligiblePayoutSettlements.map(s=><label key={s.id}>
                        <input type="checkbox" checked={selectedPayoutSettlementIds.includes(s.id)} onChange={()=>togglePayoutSettlement(s.id)}/>
                        <span><b>{s.business_name}</b><small>{s.vendor_code} · {s.settlement_number}</small></span>
                        <strong>₹{Number(s.net_payable_amount||0).toFixed(2)}</strong>
                      </label>):<p className="empty-inline">No approved settlements waiting for payout batching.</p>}
                    </div>
                    <textarea value={payoutNote} onChange={e=>setPayoutNote(e.target.value)} placeholder="Optional finance note for this batch…"/>
                    <div className="payout-create-row">
                      <span>{selectedPayoutSettlementIds.length} selected</span>
                      <b>₹{eligiblePayoutSettlements.filter(s=>selectedPayoutSettlementIds.includes(s.id)).reduce((n,s)=>n+Number(s.net_payable_amount||0),0).toFixed(2)}</b>
                      <button onClick={createPayoutBatch} disabled={payoutBusy||!selectedPayoutSettlementIds.length}>Create payout batch</button>
                    </div>
                  </section>

                  <section className="payout-card">
                    <h4>Payout batch history</h4>
                    <div className="payout-batch-list">
                      {payoutBatches.length?payoutBatches.map(b=><article key={b.id}>
                        <div><b>{b.batch_number}</b><small>{b.vendor_count||0} vendors · {b.settlement_count||0} settlements</small></div>
                        <span className={`neg-status ${String(b.status||'').toLowerCase()}`}>{b.status}</span>
                        <strong>₹{Number(b.payout_amount||0).toFixed(2)}</strong>
                        <button className="secondary" onClick={()=>openPayoutBatch(b.id)}>View</button>
                      </article>):<p className="empty-inline">No payout batches created yet.</p>}
                    </div>
                  </section>
                </div>

                {payoutBatchDetail&&<div className="payout-detail">
                  <div className="negotiation-detail-head">
                    <div><span className="eyebrow">PAYOUT BATCH</span><h4>{payoutBatchDetail.batch?.batch_number}</h4><small>{payoutBatchDetail.batch?.settlement_count} settlements · ₹{Number(payoutBatchDetail.batch?.payout_amount||0).toFixed(2)}</small></div>
                    <button className="secondary" onClick={()=>setPayoutBatchDetail(null)}>Close</button>
                  </div>
                  <div className="payout-item-list">
                    {(payoutBatchDetail.items||[]).map(i=><div key={i.id}>
                      <span><b>{i.business_name}</b><small>{i.vendor_code}</small></span>
                      <span><b>{i.settlement_number}</b><small>Order {i.order_id||'—'}</small></span>
                      <span><b>₹{Number(i.amount||0).toFixed(2)}</b><small>{i.settlement_status}</small></span>
                    </div>)}
                  </div>
                  <div className="payout-actions">
                    {payoutBatchDetail.batch?.status==='DRAFT'&&<>
                      <button onClick={()=>payoutBatchAction(payoutBatchDetail.batch.id,'approve')}>Approve batch</button>
                      <button className="secondary" onClick={()=>payoutBatchAction(payoutBatchDetail.batch.id,'cancel')}>Cancel draft</button>
                    </>}
                    {payoutBatchDetail.batch?.status==='APPROVED'&&<button onClick={()=>payoutBatchAction(payoutBatchDetail.batch.id,'mark-paid')}>Mark paid with UTR/reference</button>}
                    {payoutBatchDetail.batch?.status==='PAID'&&<div className="payout-paid-banner"><b>PAID</b><span>{payoutBatchDetail.batch.payout_reference||'Reference recorded'}</span></div>}
                  </div>
                  <div className="payout-safety"><b>Safety:</b> “Mark paid” updates HOWDI ledger only. It does not call a bank or payout provider.</div>
                </div>}
              </div>

              <div className="commercial-reconciliation-center">
                <div className="negotiation-center-head">
                  <div><span className="eyebrow">FINANCE RECONCILIATION</span><h3>Vendor Commercial Statement</h3><p>Admin and Vendor see the same monthly money view: sales, commission, delivery deductions, platform fees, settlement status and payout references.</p></div>
                  <button className="secondary" onClick={loadReconciliationVendors} disabled={reconBusy}>{reconBusy?'Loading…':'Load vendors'}</button>
                </div>

                <div className="recon-controls">
                  <label><span>Vendor</span><select value={reconVendorId} onChange={e=>{setReconVendorId(e.target.value);setReconStatement(null)}}><option value="">Select vendor</option>{reconVendors.map(v=><option value={v.id} key={v.id}>{v.business_name} · {v.vendor_code}</option>)}</select></label>
                  <label><span>Statement month</span><input type="month" value={reconMonth} onChange={e=>{setReconMonth(e.target.value);setReconStatement(null)}}/></label>
                  <button onClick={loadReconciliationStatement} disabled={reconBusy||!reconVendorId}>Load statement</button>
                </div>

                {reconStatement&&<>
                  <div className="recon-summary">
                    {[
                      ['Gross sales',reconStatement.totals?.gross],
                      ['HOWDI commission',reconStatement.totals?.commission],
                      ['Gateway fees',reconStatement.totals?.gateway],
                      ['Delivery deduction',reconStatement.totals?.delivery],
                      ['Withholding',reconStatement.totals?.withholding],
                      ['Net payable',reconStatement.totals?.net],
                      ['Paid',reconStatement.totals?.paid],
                      ['Pending payout',reconStatement.totals?.pending],
                      ['Platform outstanding',reconStatement.totals?.platformPosted]
                    ].map(([label,value])=><article key={label}><span>{label}</span><b>₹{Number(value||0).toFixed(2)}</b></article>)}
                  </div>

                  <div className="recon-rule-banner">
                    <b>Reconciliation rule</b>
                    <span>Commission comes from the order's accepted commercial snapshot.</span>
                    <span>Monthly platform fees stay separate and are not silently deducted from settlement.</span>
                    <span>Delivery is deducted only when Vendor is the configured delivery payer.</span>
                  </div>

                  <div className="recon-ledger-grid">
                    <section>
                      <h4>Settlement ledger</h4>
                      {(reconStatement.settlements||[]).length?<div className="recon-ledger">
                        {reconStatement.settlements.map(s=><div key={s.id}>
                          <span><b>{s.settlement_number}</b><small>Order {s.order_id||'—'}</small></span>
                          <span><small>Gross</small><b>₹{Number(s.gross_amount||0).toFixed(2)}</b></span>
                          <span><small>Commission</small><b>₹{Number(s.commission_amount||0).toFixed(2)}</b></span>
                          <span><small>Delivery</small><b>₹{Number(s.delivery_deduction_amount||0).toFixed(2)}</b></span>
                          <span><small>Net</small><b>₹{Number(s.net_payable_amount||0).toFixed(2)}</b></span>
                          <span className={`neg-status ${String(s.status||'').toLowerCase()}`}>{s.status}</span>
                        </div>)}
                      </div>:<p className="empty-inline">No settlement entries for this month.</p>}
                    </section>

                    <section>
                      <h4>Platform fee ledger</h4>
                      {(reconStatement.platformCharges||[]).length?<div className="recon-ledger platform">
                        {reconStatement.platformCharges.map(c=><div key={c.id}>
                          <span><b>{c.tier_code}</b><small>{c.active_product_count} products</small></span>
                          <span><small>Amount</small><b>₹{Number(c.amount||0).toFixed(2)}</b></span>
                          <span><small>Status</small><b>{c.status}</b></span>
                          <span><small>Due</small><b>{c.due_at?new Date(c.due_at).toLocaleDateString():'—'}</b></span>
                        </div>)}
                      </div>:<p className="empty-inline">No platform charge for this month.</p>}
                    </section>
                  </div>

                  <div className="recon-notes">
                    <h4>Statement notes</h4>
                    <div className="recon-note-entry"><textarea value={reconNote} onChange={e=>setReconNote(e.target.value)} placeholder="Add finance/reconciliation note visible to the vendor…"/><button onClick={addReconciliationNote} disabled={reconBusy}>Add note</button></div>
                    {(reconStatement.notes||[]).map(n=><div className="recon-note" key={n.id}><b>{n.actor_type}</b><span>{n.note}</span><small>{new Date(n.created_at).toLocaleString()}</small></div>)}
                  </div>
                </>}
              </div>

              <div className="commercial-billing-center">
                <div className="negotiation-center-head">
                  <div><span className="eyebrow">COMMERCIAL BILLING</span><h3>Product Commission & Platform Charges</h3><p>Negotiate exceptional product commission separately and generate monthly product-count platform charges from the vendor's accepted commercial plan.</p></div>
                  <button className="secondary" onClick={loadCommercialBilling} disabled={commercialBillingBusy}>{commercialBillingBusy?'Loading…':'Load commercial billing'}</button>
                </div>

                <div className="commercial-billing-grid">
                  <section className="commercial-billing-card">
                    <h4>Product-specific commission offer</h4>
                    <p>Use only when one product needs different commission from the vendor's main plan. Vendor approval is mandatory.</p>
                    <div className="commercial-form-grid compact">
                      <label><span>Vendor</span><select value={productOverrideForm.vendor_profile_id} onChange={e=>setProductOverrideForm(v=>({...v,vendor_profile_id:e.target.value}))}><option value="">Select vendor</option>{commercialVendors.map(v=><option key={v.id} value={v.id}>{v.business_name} · {v.vendor_code}</option>)}</select></label>
                      <label><span>Product ID</span><input value={productOverrideForm.product_id} onChange={e=>setProductOverrideForm(v=>({...v,product_id:e.target.value}))} placeholder="Vendor product ID"/></label>
                      <label><span>Commission type</span><select value={productOverrideForm.commission_type} onChange={e=>setProductOverrideForm(v=>({...v,commission_type:e.target.value}))}><option value="percentage">Percentage</option><option value="flat">Flat</option></select></label>
                      <label><span>Commission value</span><input type="number" min="0" step="0.01" value={productOverrideForm.commission_value} onChange={e=>setProductOverrideForm(v=>({...v,commission_value:e.target.value}))}/></label>
                      <label><span>Minimum ₹</span><input type="number" min="0" step="0.01" value={productOverrideForm.commission_min_amount} onChange={e=>setProductOverrideForm(v=>({...v,commission_min_amount:e.target.value}))}/></label>
                      <label><span>Maximum ₹</span><input type="number" min="0" step="0.01" value={productOverrideForm.commission_max_amount} onChange={e=>setProductOverrideForm(v=>({...v,commission_max_amount:e.target.value}))}/></label>
                      <label><span>Negotiation days</span><input type="number" min="1" max="90" value={productOverrideForm.negotiation_days} onChange={e=>setProductOverrideForm(v=>({...v,negotiation_days:e.target.value}))}/></label>
                      <label><span>Reason</span><input value={productOverrideForm.reason} onChange={e=>setProductOverrideForm(v=>({...v,reason:e.target.value}))} placeholder="Special category / campaign / handmade premium…"/></label>
                      <label className="commercial-note"><span>Admin note</span><textarea value={productOverrideForm.admin_note} onChange={e=>setProductOverrideForm(v=>({...v,admin_note:e.target.value}))}/></label>
                    </div>
                    <button onClick={sendProductOverride} disabled={commercialBillingBusy}>Send product commission offer</button>
                  </section>

                  <section className="commercial-billing-card">
                    <h4>Monthly platform billing</h4>
                    <p>Counts vendor products once for the selected month and applies the accepted 1–100 / 101–1000 / 1001+ monthly tier. Re-running the same month does not duplicate a charge.</p>
                    <label className="platform-month"><span>Charge month</span><input type="month" value={platformChargeMonth} onChange={e=>setPlatformChargeMonth(e.target.value)}/></label>
                    <button onClick={generatePlatformCharges} disabled={commercialBillingBusy}>Generate monthly platform charges</button>
                    <div className="platform-total-strip">
                      <span><small>Posted</small><b>₹{Number(platformChargeTotals.posted||0).toFixed(2)}</b></span>
                      <span><small>Paid</small><b>₹{Number(platformChargeTotals.paid||0).toFixed(2)}</b></span>
                      <span><small>Waived</small><b>₹{Number(platformChargeTotals.waived||0).toFixed(2)}</b></span>
                    </div>
                  </section>
                </div>

                <div className="commercial-billing-list">
                  <h4>Product override activity</h4>
                  {productOverrides.length?<div className="billing-table">
                    {productOverrides.slice(0,50).map(o=><div key={o.id}><span><b>{o.business_name}</b><small>{o.vendor_code}</small></span><span><b>{o.product_name||o.product_id}</b><small>{o.sku||`Product ${o.product_id}`}</small></span><span>V{o.version}</span><span>{Number(o.commission_value||0)}{o.commission_type==='flat'?' ₹':'%'}</span><span className={`neg-status ${String(o.status||'').toLowerCase()}`}>{o.status}</span>{o.vendor_note&&<span><small>Vendor: {o.vendor_note}</small></span>}</div>)}
                  </div>:<p className="empty-inline">No product-specific commission offers yet.</p>}
                </div>

                <div className="commercial-billing-list">
                  <h4>Monthly platform charge ledger</h4>
                  {platformCharges.length?<div className="billing-table platform">
                    {platformCharges.slice(0,100).map(c=><div key={c.id}><span><b>{c.business_name}</b><small>{c.vendor_code}</small></span><span><b>{String(c.charge_month||'').slice(0,10)}</b><small>{c.active_product_count} products · {c.tier_code}</small></span><span>₹{Number(c.amount||0).toFixed(2)}</span><span className={`neg-status ${String(c.status||'').toLowerCase()}`}>{c.status}</span><span className="neg-actions">{c.status==='POSTED'&&<><button onClick={()=>updatePlatformCharge(c.id,'paid')}>Mark paid</button><button className="secondary" onClick={()=>updatePlatformCharge(c.id,'waive')}>Waive</button></>}</span></div>)}
                  </div>:<p className="empty-inline">No monthly platform charges generated yet.</p>}
                </div>

                <div className="commercial-future-note"><b>Billing protection:</b> product overrides need vendor acceptance; platform charges use the accepted vendor plan snapshot; delivery/Shiprocket cost remains separate from both commission and platform fees.</div>
              </div>

              <div className="commercial-admin-layout">
                <div className="commercial-offer-editor">
                  <label><span>Vendor</span><select value={commercialSelectedVendor} onChange={e=>{setCommercialSelectedVendor(e.target.value);setCommercialTimeline([])}}>
                    <option value="">Select vendor</option>
                    {commercialVendors.map(v=><option value={v.id} key={v.id}>{v.business_name} · {v.vendor_code} · {v.city||'—'}</option>)}
                  </select></label>

                  <div className="commercial-current-card">
                    {(()=>{const v=commercialVendors.find(x=>String(x.id)===String(commercialSelectedVendor));const a=v?.active_agreement;return v?<><b>{v.business_name}</b><span>{v.product_count||0} active/catalogue products</span><small>Current: {a?.agreement_name||'Founding Free Plan'} · V{a?.version||1} · {Number(a?.commission_value||0)}{a?.commission_type==='flat'?' ₹ flat':'%'} commission</small></>:<small>Select a vendor to prepare negotiated terms.</small>})()}
                  </div>

                  <div className="commercial-form-grid">
                    <label><span>Agreement name</span><input value={commercialOfferForm.agreement_name} onChange={e=>setCommercialOfferForm(v=>({...v,agreement_name:e.target.value}))}/></label>
                    <label><span>Commission type</span><select value={commercialOfferForm.commission_type} onChange={e=>setCommercialOfferForm(v=>({...v,commission_type:e.target.value}))}><option value="percentage">Percentage</option><option value="flat">Flat per delivered item/order basis</option></select></label>
                    <label><span>Commission value</span><input type="number" min="0" step="0.01" value={commercialOfferForm.commission_value} onChange={e=>setCommercialOfferForm(v=>({...v,commission_value:e.target.value}))}/></label>
                    <label><span>Commission minimum ₹</span><input type="number" min="0" step="0.01" value={commercialOfferForm.commission_min_amount} onChange={e=>setCommercialOfferForm(v=>({...v,commission_min_amount:e.target.value}))}/></label>
                    <label><span>Commission maximum ₹</span><input type="number" min="0" step="0.01" value={commercialOfferForm.commission_max_amount} onChange={e=>setCommercialOfferForm(v=>({...v,commission_max_amount:e.target.value}))}/></label>
                    <label><span>Free commission days</span><input type="number" min="0" max="3650" value={commercialOfferForm.free_commission_days} onChange={e=>setCommercialOfferForm(v=>({...v,free_commission_days:e.target.value}))}/></label>
                    <label><span>Settlement cycle days</span><input type="number" min="1" max="90" value={commercialOfferForm.settlement_cycle_days} onChange={e=>setCommercialOfferForm(v=>({...v,settlement_cycle_days:e.target.value}))}/></label>
                    <label><span>Negotiation validity days</span><input type="number" min="1" max="90" value={commercialOfferForm.negotiation_days} onChange={e=>setCommercialOfferForm(v=>({...v,negotiation_days:e.target.value}))}/></label>
                    <label><span>1–100 products / month ₹</span><input type="number" min="0" step="0.01" value={commercialOfferForm.tier_1_monthly_fee} onChange={e=>setCommercialOfferForm(v=>({...v,tier_1_monthly_fee:e.target.value}))}/></label>
                    <label><span>101–1000 products / month ₹</span><input type="number" min="0" step="0.01" value={commercialOfferForm.tier_2_monthly_fee} onChange={e=>setCommercialOfferForm(v=>({...v,tier_2_monthly_fee:e.target.value}))}/></label>
                    <label><span>1001+ products / month ₹</span><input type="number" min="0" step="0.01" value={commercialOfferForm.tier_3_monthly_fee} onChange={e=>setCommercialOfferForm(v=>({...v,tier_3_monthly_fee:e.target.value}))}/></label>
                    <label><span>Vendor discount cap %</span><input type="number" min="0" max="100" step="0.01" value={commercialOfferForm.vendor_discount_cap_percent} onChange={e=>setCommercialOfferForm(v=>({...v,vendor_discount_cap_percent:e.target.value}))}/></label>
                    <label className="commercial-check"><input type="checkbox" checked={commercialOfferForm.howdi_funded_discount_allowed} onChange={e=>setCommercialOfferForm(v=>({...v,howdi_funded_discount_allowed:e.target.checked}))}/><span>HOWDI-funded promotions allowed</span></label>
                    <label className="commercial-note"><span>Negotiation / Admin note</span><textarea value={commercialOfferForm.admin_note} onChange={e=>setCommercialOfferForm(v=>({...v,admin_note:e.target.value}))} placeholder="Why these terms are being offered..."/></label>
                  </div>

                  <div className="commercial-locked-rule">
                    <b>Locked marketplace rule</b>
                    <span>Delivery charge / Shiprocket cost is separate and never part of HOWDI commission basis.</span>
                    <span>Old orders keep the commercial snapshot accepted at the time of purchase.</span>
                  </div>

                  <button onClick={sendCommercialOffer} disabled={commercialBusy||!commercialSelectedVendor}>Send negotiated offer to vendor</button>
                </div>

                <div className="commercial-vendor-list">
                  <h4>Vendor status</h4>
                  {commercialVendors.map(v=><article key={v.id} className={String(v.id)===String(commercialSelectedVendor)?'selected':''} onClick={()=>setCommercialSelectedVendor(String(v.id))}>
                    <div><b>{v.business_name}</b><small>{v.vendor_code} · {v.city||'—'} · {v.product_count||0} products</small></div>
                    <span>{v.pending_offer?.status||v.active_agreement?.status||'FREE'}</span>
                    <small>Active V{v.active_agreement?.version||1}: {Number(v.active_agreement?.commission_value||0)}{v.active_agreement?.commission_type==='flat'?' ₹':'%'}</small>
                    {v.pending_offer&&<><em>Offer V{v.pending_offer.version}: {Number(v.pending_offer.commission_value||0)}{v.pending_offer.commission_type==='flat'?' ₹':'%'} · {v.pending_offer.free_commission_days||0} free days</em><button type="button" onClick={e=>{e.stopPropagation();loadCommercialTimeline(v.pending_offer.id)}}>Timeline</button></>}
                  </article>)}
                </div>
              </div>

              {commercialTimeline.length>0&&<div className="commercial-timeline">
                <h4>Negotiation timeline</h4>
                {commercialTimeline.map(e=><div key={e.id}><b>{String(e.event_type||'').replaceAll('_',' ')}</b><span>{e.actor_type} · {e.created_at?new Date(e.created_at).toLocaleString():'—'}</span>{e.message&&<small>{e.message}</small>}</div>)}
              </div>}

              <div className="commercial-future-note"><b>Future-ready:</b> city / Tier-1 / Tier-2 / Tier-3 automatic pricing can be added later as a policy engine. It will issue a new agreement version instead of silently changing vendor terms.</div>
            </section>}
            {hpaySection==='settlements'&&<section className="panel hpay-settlement-section">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">VENDOR MONEY MOVEMENT</span>
                  <h3>HPay Vendor Settlements</h3>
                  <p>Control the settlement policy, generate payable ledgers from delivered shipments, approve payouts and keep a permanent audit trail.</p>
                </div>
                <div className="settlement-head-actions">
                  <button className="secondary" onClick={loadVendorSettlements} disabled={settlementBusy}>{settlementBusy?'Loading…':'Load settlements'}</button>
                  <button onClick={generateVendorSettlements} disabled={settlementBusy}>Generate from delivered</button>
                </div>
              </div>

              <div className="settlement-summary-grid">
                <div><b>{settlementSummary.hold_count||0}</b><span>On hold</span></div>
                <div><b>{settlementSummary.eligible_count||0}</b><span>Eligible</span></div>
                <div><b>{settlementSummary.approved_count||0}</b><span>Approved</span></div>
                <div><b>₹{Number(settlementSummary.paid_amount||0).toFixed(2)}</b><span>Paid ledger</span></div>
              </div>

              <div className="settlement-policy-card">
                <div className="settlement-policy-head">
                  <div><span className="eyebrow">DEFAULT POLICY</span><h4>Future settlements use this rule</h4></div>
                  <button onClick={saveSettlementRule} disabled={settlementBusy}>Save policy</button>
                </div>
                <div className="settlement-policy-grid">
                  <label><span>Rule name</span><input value={settlementRuleForm.rule_name} onChange={e=>setSettlementRuleForm(v=>({...v,rule_name:e.target.value}))}/></label>
                  <label><span>Commission type</span><select value={settlementRuleForm.commission_type} onChange={e=>setSettlementRuleForm(v=>({...v,commission_type:e.target.value}))}><option value="percentage">Percentage</option><option value="flat">Flat amount</option></select></label>
                  <label><span>HOWDI commission</span><input type="number" min="0" step="0.01" value={settlementRuleForm.commission_value} onChange={e=>setSettlementRuleForm(v=>({...v,commission_value:e.target.value}))}/></label>
                  <label><span>Settlement hold days</span><input type="number" min="0" max="365" value={settlementRuleForm.settlement_hold_days} onChange={e=>setSettlementRuleForm(v=>({...v,settlement_hold_days:e.target.value}))}/></label>
                  <label><span>Gateway fee %</span><input type="number" min="0" step="0.01" value={settlementRuleForm.payment_gateway_fee_percent} onChange={e=>setSettlementRuleForm(v=>({...v,payment_gateway_fee_percent:e.target.value}))}/></label>
                  <label><span>Gateway flat fee ₹</span><input type="number" min="0" step="0.01" value={settlementRuleForm.payment_gateway_fee_flat} onChange={e=>setSettlementRuleForm(v=>({...v,payment_gateway_fee_flat:e.target.value}))}/></label>
                  <label><span>Withholding reserve %</span><input type="number" min="0" step="0.01" value={settlementRuleForm.tax_withholding_percent} onChange={e=>setSettlementRuleForm(v=>({...v,tax_withholding_percent:e.target.value}))}/></label>
                </div>
                <small className="settlement-policy-warning">Changing the policy affects only settlements generated after the change. Existing settlement snapshots remain unchanged. Set statutory withholding only after Finance/legal confirms the applicable tax treatment.</small>
              </div>

              <div className="settlement-list">
                {vendorSettlements.length?vendorSettlements.map(s=><div className="settlement-card" key={s.id}>
                  <div className="settlement-card-head">
                    <div><b>{s.settlement_number}</b><small>{s.business_name||s.vendor_code||'Vendor'} · {s.order_number||s.order_id||'Order'}</small></div>
                    <span className={`settlement-status settlement-${String(s.status||'hold').toLowerCase()}`}>{s.status}</span>
                  </div>
                  <div className="settlement-money-grid">
                    <span><small>Gross</small><b>₹{Number(s.gross_amount||0).toFixed(2)}</b></span>
                    <span><small>HOWDI commission</small><b>-₹{Number(s.commission_amount||0).toFixed(2)}</b></span>
                    <span><small>Gateway fee</small><b>-₹{Number(s.gateway_fee_amount||0).toFixed(2)}</b></span>
                    <span><small>Delivery</small><b>-₹{Number(s.delivery_deduction_amount||0).toFixed(2)}</b></span>
                    <span className="settlement-net"><small>Vendor payable</small><b>₹{Number(s.net_payable_amount||0).toFixed(2)}</b></span>
                  </div>
                  <div className="settlement-actions">
                    {['HOLD','ELIGIBLE'].includes(s.status)&&<button onClick={()=>updateVendorSettlement(s.id,'approve')} disabled={settlementBusy}>Approve</button>}
                    {s.status==='APPROVED'&&<>
                      <input placeholder="Bank / UTR / payout reference" value={settlementRefs[s.id]||''} onChange={e=>setSettlementRefs(v=>({...v,[s.id]:e.target.value}))}/>
                      <button onClick={()=>updateVendorSettlement(s.id,'mark-paid')} disabled={settlementBusy}>Mark paid</button>
                    </>}
                    {s.status!=='PAID'&&s.status!=='HOLD'&&<button className="secondary" onClick={()=>updateVendorSettlement(s.id,'hold')} disabled={settlementBusy}>Put on hold</button>}
                    <button className="secondary" onClick={()=>loadSettlementTimeline(s.id)}>Timeline</button>
                  </div>
                  {settlementTimelineOpen===s.id&&<div className="settlement-timeline">
                    {(settlementTimeline[s.id]||[]).length?(settlementTimeline[s.id]||[]).map(ev=><div key={ev.id}><b>{String(ev.event_type||'').replaceAll('_',' ')}</b><span>{ev.created_at?new Date(ev.created_at).toLocaleString():'—'} · {ev.actor||'system'}</span>{ev.amount!==null&&ev.amount!==undefined&&<em>₹{Number(ev.amount).toFixed(2)}</em>}{ev.note&&<small>{ev.note}</small>}</div>):<small>No settlement timeline activity yet.</small>}
                  </div>}
                </div>):<div className="empty-state hpay-empty-state"><span>₹</span><div><strong>No vendor settlement entries yet</strong><small>Generate entries after a vendor shipment reaches Delivered.</small></div></div>}
              </div>

              <div className="settlement-safety-note"><b>V16.1 safety:</b> settlement approval and “Mark paid” are ledger controls. No bank or payout provider is called yet.</div>
            </section>}
            {hpaySection==='billpay'&&<section className="panel hpay-admin-section hpay-billpay-section">
              <div className="hpay-billpay-head">
                <div>
                  <span className="eyebrow">HPAY BILL PAY SERVICES</span>
                  <h3>Recharge, bills & recurring payments</h3>
                  <p>Admin catalogue foundation for BBPS/provider-backed bill payment services. These tiles do not move money until an authorized provider and backend bill-pay APIs are connected.</p>
                </div>
                <span className="provider-ready-chip">Provider integration required</span>
              </div>
              <div className="hpay-billpay-grid">
                {[
                  ['📱','Mobile Recharge','Prepaid mobile recharge'],
                  ['📡','DTH Recharge','DTH television recharge'],
                  ['⚡','Electricity','Electricity board bills'],
                  ['🔥','Gas','Piped gas and LPG-related billers'],
                  ['🌐','Broadband','Broadband and internet bills'],
                  ['☎️','Landline','Landline and postpaid services'],
                  ['🚘','FASTag','FASTag recharge and toll balance'],
                  ['💧','Water','Water utility bills'],
                  ['🏛️','Municipal Tax','Municipal and property tax billers'],
                  ['💳','Credit Card','Credit-card bill payments'],
                  ['🛡️','Insurance','Eligible insurance premium billers'],
                  ['🎓','Education Fees','School, college and education billers'],
                  ['🏦','Loan Repayment','Eligible loan repayment billers'],
                  ['🏠','Housing Society','Housing and maintenance billers'],
                  ['📺','Cable TV','Cable television billers'],
                  ['🧾','Subscriptions','Supported recurring biller categories']
                ].map(([icon,title,desc])=><article key={title}>
                  <i>{icon}</i>
                  <div><b>{title}</b><small>{desc}</small></div>
                  <span>READY</span>
                </article>)}
              </div>
              <div className="hpay-production-warning"><b>Production boundary</b><span>Bill fetch, validation, payment, reversal, refund and settlement must come from the authorized bill-payment/provider APIs and the HOWDI backend ledger. The Admin UI must never mark a bill as paid by itself.</span></div>
            </section>}
            {hpaySection==='risk'&&<section className="hpay-risk-layout"><section className="panel hpay-admin-section"><div className="panel-head"><div><span className="eyebrow">LIVE RISK EVENTS</span><h3>{hpayRiskEvents.length} risk records</h3><p>Risk events are read from PostgreSQL.</p></div></div><div className="hpay-risk-alerts">{hpayRiskEvents.map(x=><article key={x.id}><span className={`hpay-risk ${String(x.severity||'low').toLowerCase()}`}>{String(x.severity||'low').toLowerCase()}</span><div><b>{x.hpay_transaction_id||x.event_type}</b><small>{x.full_name||x.hpay_id||'System'} · {x.reason||x.event_type}</small></div></article>)}</div></section><aside className="panel hpay-limit-panel"><span className="eyebrow">BACKEND LIMITS</span><h3>Payment limits</h3><label>Single transaction limit<input value={hpaySettings.singleLimit} onChange={e=>setHpaySettings({...hpaySettings,singleLimit:e.target.value})}/></label><label>Daily account limit<input value={hpaySettings.dailyLimit} onChange={e=>setHpaySettings({...hpaySettings,dailyLimit:e.target.value})}/></label><div className="hpay-risk-modes">{['light','balanced','strict'].map(id=><button key={id} className={hpayRiskMode===id?'active':''} onClick={()=>setHpayRiskMode(id)}><b>{id}</b></button>)}</div><button className="primary" onClick={()=>saveHpaySettings(hpaySettings)}>Save limits & risk mode</button></aside></section>}
            {hpaySection==='settings'&&<section className="panel hpay-admin-section"><div className="panel-head"><div><span className="eyebrow">POSTGRESQL CONFIGURATION</span><h3>HPay features & rails</h3><p>These switches now save through the HPay backend API.</p></div><button className="primary" onClick={()=>saveHpaySettings(hpaySettings)}>Save HPay settings</button></div><div className="hpay-settings-grid">{[['enabled','HPay master access','Master HPay availability','₹'],['qr','QR payments','QR payment entry points','▣'],['upi','UPI payments','UPI payment entry points','@'],['bank','Bank transfer','Bank transfer entry points','▤'],['requests','Payment requests','Request money flows','↙'],['chatPay','Pay inside Messages','Connect Pay / Request actions','◌'],['autoRefund','Automatic refunds','Reserved for provider-backed rules','↩']].map(([key,title,desc,icon])=><article key={key}><i>{icon}</i><div><b>{title}</b><small>{desc}</small></div><label className="hpay-switch"><input type="checkbox" checked={!!hpaySettings[key]} onChange={e=>setHpaySettings({...hpaySettings,[key]:e.target.checked})}/><span/></label></article>)}</div><div className="hpay-production-warning"><b>Provider boundary</b><span>Frontend and Admin do not settle money. Provider confirmation + backend ledger remain the source of truth.</span></div></section>}
          </div>
        )}

        {tab==='payments' && (
          <div className="page payments-page">
            <section className="payments-hero">
              <div><span className="eyebrow">HOWDI FINANCE CONTROL</span><h2>Payments. References. Refund status.</h2><p>Monitor customer money movement separately from HPay finance governance. Payments now use a PostgreSQL transaction ledger with controlled refund workflow, while HPay settlement and payout governance stays separate.</p></div><button className="secondary" onClick={loadPaymentTransactions} disabled={paymentLedgerLoading}>{paymentLedgerLoading?'Refreshing…':'Refresh ledger'}</button>
              <div className="payments-hero-note">💳 <span>Order payment records</span></div>
            </section>
            <section className="payments-stats">
              <div className="payment-stat"><span>Total transaction value</span><strong>{formatOrderAmount(paymentLedgerSummary?.total_value??paymentStats.total)}</strong><small>{Number(paymentLedgerSummary?.total_count??paymentRecords.length)} payment record{paymentRecords.length===1?'':'s'}</small></div>
              <div className="payment-stat"><span>Successfully paid</span><strong>{formatOrderAmount(paymentLedgerSummary?.paid_value??paymentStats.paid)}</strong><small>Captured/confirmed payments</small></div>
              <div className="payment-stat"><span>Pending / processing</span><strong>{formatOrderAmount(paymentLedgerSummary?.pending_value??paymentStats.pending)}</strong><small>Needs payment review</small></div>
              <div className="payment-stat"><span>Refunded</span><strong>{formatOrderAmount(paymentLedgerSummary?.refunded_value??paymentStats.refunded)}</strong><small>Returned to customer flow</small></div>
            </section>
            <section className="payments-workspace">
              <section className="panel payment-list-panel">
                <div className="list-head payments-list-head"><div><span className="eyebrow">TRANSACTION QUEUE</span><h3>{filteredPayments.length} of {paymentRecords.length} records</h3></div><div className="payments-filters"><select value={paymentStatusFilter} onChange={e=>setPaymentStatusFilter(e.target.value)}><option value="all">All payment statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="initiated">Initiated</option><option value="processing">Processing</option><option value="failed">Failed</option><option value="refunded">Refunded</option><option value="refund_pending">Refund pending</option></select><input className="search" placeholder="Payment, order, HOWDI ID..." value={paymentSearch} onChange={e=>setPaymentSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')loadPaymentTransactions()}}/><button className="secondary payment-filter-apply" onClick={loadPaymentTransactions}>Apply</button></div></div>
                <div className="payment-table">{filteredPayments.map(payment=><article className={`payment-item ${selectedPayment?.id===payment.id?'selected':''}`} key={payment.id} onClick={()=>{setSelectedPayment(payment);setPaymentHpayTrace(null);setPaymentRefundControl(null);setTimeout(()=>loadPaymentRefundControl(payment),0)}}><div className="payment-id"><strong>{payment.id}</strong><span>{payment.orderNumber}</span></div><div className="payment-customer"><strong>{payment.customerName}</strong><span>{payment.howdiId||'HOWDI customer'}</span></div><div className="payment-method"><strong>{payment.method}</strong><span>{new Date(payment.createdAt).toLocaleString('en-IN')}</span></div><div className="payment-amount"><b>{formatOrderAmount(payment.amount)}</b><span className={`payment-status ${payment.status.replaceAll('_','-')}`}>{payment.status.replaceAll('_',' ')}</span></div><button className="order-open" onClick={e=>{e.stopPropagation();setSelectedPayment(payment);setPaymentHpayTrace(null);setPaymentRefundControl(null);setTimeout(()=>loadPaymentRefundControl(payment),0)}}>View</button></article>)}{filteredPayments.length===0&&<div className="empty-state">💳 No payment records match your filters. Orders will populate this control center when checkout payment integration is connected.</div>}</div>
              </section>
              <aside className="panel payment-detail-panel">{!selectedPayment?<div className="order-empty"><div>💳</div><strong>Select a transaction</strong><span>Review amount, method, gateway reference and payment status.</span></div>:<>
                <div className="order-detail-head"><div><span className="eyebrow">PAYMENT DETAIL</span><h3>{selectedPayment.id}</h3><span className={`payment-status ${selectedPayment.status.replaceAll('_','-')}`}>{selectedPayment.status.replaceAll('_',' ')}</span></div><button onClick={()=>{setSelectedPayment(null);setPaymentHpayTrace(null);setPaymentRefundControl(null)}}>×</button></div>
                <div className="order-detail-section"><small>AMOUNT</small><strong>{formatOrderAmount(selectedPayment.amount)}</strong><span>Order {selectedPayment.orderNumber}</span></div>
                <div className="order-detail-section"><small>CUSTOMER</small><strong>{selectedPayment.customerName}</strong><span>{selectedPayment.howdiId||'HOWDI customer'}</span></div>
                <div className="order-detail-section"><small>METHOD & REFERENCE</small><strong>{selectedPayment.method}</strong><span>{selectedPayment.reference}</span></div>
                <div className="order-detail-section payment-ledger-source">
                  <small>TRANSACTION LEDGER</small>
                  <strong>{selectedPayment.provider||'HOWDI'} · {String(selectedPayment.source||'ORDER_COMPATIBILITY').replaceAll('_',' ')}</strong>
                  <span>{selectedPayment.dbId?`PostgreSQL transaction #${selectedPayment.dbId}`:'Compatibility record from order data'}</span>
                </div>
                {selectedPayment.events?.length>0&&<div className="payment-ledger-events">
                  <small>STATUS HISTORY</small>
                  {selectedPayment.events.slice(0,5).map(event=><article key={event.id}>
                    <span><b>{String(event.event_type||'EVENT').replaceAll('_',' ')}</b><small>{event.from_status||'—'} → {event.to_status||'—'}</small></span>
                    <em>{new Date(event.created_at).toLocaleString('en-IN')}</em>
                  </article>)}
                </div>}
                <div className="order-flow"><small>PAYMENT STATUS</small><select value={selectedPayment.status} onChange={e=>updatePaymentStatus(selectedPayment,e.target.value)}><option value="paid">Paid</option><option value="pending">Pending</option><option value="initiated">Initiated</option><option value="processing">Processing</option><option value="failed">Failed</option><option value="refunded">Refunded</option><option value="refund_pending">Refund pending</option></select><p>Admin status writes to the PostgreSQL payment ledger and keeps the linked order payment status aligned. A future live gateway webhook will become the authoritative provider event source.</p></div>

                <section className="payment-refund-control">
                  <div className="payment-refund-head">
                    <div>
                      <span className="eyebrow">V18.4 · PAYMENT REFUND CONTROL</span>
                      <h4>Refund workflow</h4>
                      <p>Request, approve and record external refund processing without mixing refund money movement into HPay settlement control.</p>
                    </div>
                    <button className="secondary" onClick={()=>loadPaymentRefundControl(selectedPayment)} disabled={paymentRefundBusy}>{paymentRefundBusy?'Loading…':'Refresh refunds'}</button>
                  </div>

                  {selectedPayment.dbId?<>
                    <div className="payment-refund-kpis">
                      <article><small>Payment amount</small><b>{formatOrderAmount(paymentRefundControl?.summary?.paymentAmount??selectedPayment.amount)}</b></article>
                      <article><small>Refund reserved</small><b>{formatOrderAmount(paymentRefundControl?.summary?.reservedRefundAmount||0)}</b></article>
                      <article><small>Processed refund</small><b>{formatOrderAmount(paymentRefundControl?.summary?.processedRefundAmount||0)}</b></article>
                      <article><small>Refundable now</small><b>{formatOrderAmount(paymentRefundControl?.summary?.refundableAmount??selectedPayment.amount)}</b></article>
                    </div>

                    <div className="payment-refund-create">
                      <label>Refund amount
                        <input type="number" min="0" step="0.01" value={paymentRefundAmount} onChange={e=>setPaymentRefundAmount(e.target.value)} placeholder="0.00"/>
                      </label>
                      <label>Reason
                        <input value={paymentRefundReason} onChange={e=>setPaymentRefundReason(e.target.value)} placeholder="Customer cancellation / duplicate payment / service issue…"/>
                      </label>
                      <button onClick={createPaymentRefundRequest} disabled={paymentRefundBusy||!paymentRefundAmount||!paymentRefundReason.trim()}>Create refund request</button>
                    </div>

                    {(paymentRefundControl?.refunds||[]).length?<div className="payment-refund-list">
                      {paymentRefundControl.refunds.map(refund=><article key={refund.id}>
                        <div className="payment-refund-row-top">
                          <span><b>{refund.refund_code}</b><small>{refund.reason}</small></span>
                          <strong>{formatOrderAmount(refund.amount)}</strong>
                          <em className={`refund-status ${String(refund.status||'').toLowerCase()}`}>{refund.status}</em>
                        </div>

                        <div className="payment-refund-meta">
                          <span>Requested: {new Date(refund.requested_at).toLocaleString('en-IN')}</span>
                          <span>{refund.external_refund_reference?`External ref: ${refund.external_refund_reference}`:'No gateway/UTR reference yet'}</span>
                        </div>

                        <div className="payment-refund-actions">
                          {refund.status==='REQUESTED'&&<>
                            <button onClick={()=>paymentRefundAction(refund,'approve')} disabled={paymentRefundBusy}>Approve</button>
                            <button className="secondary" onClick={()=>paymentRefundAction(refund,'reject')} disabled={paymentRefundBusy}>Reject</button>
                          </>}
                          {refund.status==='APPROVED'&&<>
                            <button onClick={()=>paymentRefundAction(refund,'processed')} disabled={paymentRefundBusy}>Mark processed</button>
                            <button className="secondary" onClick={()=>paymentRefundAction(refund,'failed')} disabled={paymentRefundBusy}>Mark failed</button>
                          </>}
                          {['PROCESSED','REJECTED','FAILED'].includes(refund.status)&&<span>Workflow complete</span>}
                        </div>

                        {refund.events?.length>0&&<details className="payment-refund-events">
                          <summary>Audit trail ({refund.events.length})</summary>
                          {refund.events.map(event=><div key={event.id}><b>{String(event.event_type||'EVENT').replaceAll('_',' ')}</b><span>{event.from_status||'—'} → {event.to_status||'—'} · {event.actor||'SYSTEM'} · {new Date(event.created_at).toLocaleString('en-IN')}</span></div>)}
                        </details>}
                      </article>)}
                    </div>:<div className="payment-refund-empty">
                      <span>↩️</span>
                      <p>No refund requests for this payment.</p>
                    </div>}
                  </>:<div className="payment-refund-empty">
                    <span>🗂️</span>
                    <p>Refund Control is available for PostgreSQL payment-ledger transactions.</p>
                  </div>}
                </section>

                <section className="payment-hpay-trace">
                  <div className="payment-hpay-trace-head">
                    <div><span className="eyebrow">PAYMENTS ↔ HPAY CONTROL</span><h4>Finance trace</h4><p>Payments shows customer money movement. HPay Control shows the Vendor settlement and payout impact created from this order.</p></div>
                    <button onClick={()=>loadPaymentHpayTrace(selectedPayment)} disabled={paymentHpayBusy}>{paymentHpayBusy?'Checking…':'Trace in HPay'}</button>
                  </div>

                  {!paymentHpayTrace?<div className="payment-hpay-empty">
                    <span>🔗</span>
                    <p>Use <b>Trace in HPay</b> to see whether this payment/order has generated Vendor settlement and payout records.</p>
                  </div>:<>
                    <div className={`payment-hpay-status ${String(paymentHpayTrace.traceStatus||'').toLowerCase()}`}>
                      <b>{String(paymentHpayTrace.traceStatus||'').replaceAll('_',' ')}</b>
                      <span>Order {paymentHpayTrace.orderId}</span>
                    </div>

                    <div className="payment-hpay-kpis">
                      <article><small>Order gross</small><b>{formatOrderAmount(paymentHpayTrace.totals?.gross||0)}</b></article>
                      <article><small>HOWDI commission</small><b>{formatOrderAmount(paymentHpayTrace.totals?.commission||0)}</b></article>
                      <article><small>Delivery deduction</small><b>{formatOrderAmount(paymentHpayTrace.totals?.delivery||0)}</b></article>
                      <article><small>Vendor net</small><b>{formatOrderAmount(paymentHpayTrace.totals?.net||0)}</b></article>
                      <article><small>Paid</small><b>{formatOrderAmount(paymentHpayTrace.totals?.paid||0)}</b></article>
                      <article><small>Outstanding</small><b>{formatOrderAmount(paymentHpayTrace.totals?.outstanding||0)}</b></article>
                    </div>

                    {(paymentHpayTrace.vendorSettlements||[]).length?<div className="payment-hpay-settlements">
                      {(paymentHpayTrace.vendorSettlements||[]).map(s=>{
                        const payout=(paymentHpayTrace.payoutItems||[]).find(p=>Number(p.settlement_id)===Number(s.id));
                        return <article key={s.id}>
                          <div className="payment-hpay-settlement-top">
                            <span><b>{s.settlement_number}</b><small>{s.business_name||s.vendor_code||'Vendor'} · {s.hpay_account_id||'HPay identity pending'}</small></span>
                            <em>{s.status}</em>
                          </div>
                          <div className="payment-hpay-settlement-grid">
                            <span><small>Gross</small><b>{formatOrderAmount(s.gross_amount)}</b></span>
                            <span><small>Commission</small><b>{formatOrderAmount(s.commission_amount)}</b></span>
                            <span><small>Gateway fee</small><b>{formatOrderAmount(s.gateway_fee_amount)}</b></span>
                            <span><small>Delivery</small><b>{formatOrderAmount(s.delivery_deduction_amount)}</b></span>
                            <span><small>Net payable</small><b>{formatOrderAmount(s.net_payable_amount)}</b></span>
                            <span><small>Payout</small><b>{payout?.batch_number||s.payout_batch_number||'Not batched'}</b></span>
                          </div>
                          <div className="payment-hpay-actions">
                            <span>{payout?.payout_reference||s.payout_reference||'No payout/UTR reference yet'}</span>
                            {s.hpay_account_db_id&&<button className="secondary" onClick={()=>openPaymentTraceParticipant(s.hpay_account_db_id)}>Open Participant 360</button>}
                          </div>
                        </article>;
                      })}
                    </div>:<div className="payment-hpay-empty result">
                      <span>⏳</span>
                      <p>No Vendor settlement exists for this order yet. This is normal until the qualifying delivery/settlement conditions are met.</p>
                    </div>}

                    {(paymentHpayTrace.shipments||[]).length>0&&<div className="payment-hpay-shipment">
                      <small>FULFILMENT CONTEXT</small>
                      {(paymentHpayTrace.shipments||[]).slice(0,3).map(s=><span key={s.id}><b>{s.shipment_number||s.awb_code||s.id}</b> · {s.provider_key||'provider pending'} · {s.status}</span>)}
                    </div>}
                  </>}
                </section>
              </>}</aside>
            </section>
          </div>
        )}

        {tab==='moderation' && (
          <div className="page moderation-page">
            <section className="moderation-hero">
              <div><span className="eyebrow">HOWDI CONNECT SAFETY</span><h2>Reports, review and responsible action.</h2><p>One operational queue for future chats, groups, channels, spaces and HOWDI Vibe. This is the admin foundation; automated moderation can be added later without replacing the workflow.</p></div>
              <div className="moderation-hero-badge">🛡️<strong>{moderationStats.open}</strong><small>open reports</small></div>
            </section>
            <section className="moderation-stat-grid">
              <div className="moderation-stat"><span>Total reports</span><strong>{moderationStats.total}</strong><small>All safety reports</small></div>
              <div className="moderation-stat"><span>Open</span><strong>{moderationStats.open}</strong><small>Needs first review</small></div>
              <div className="moderation-stat"><span>Reviewing</span><strong>{moderationStats.reviewing}</strong><small>Under investigation</small></div>
              <div className="moderation-stat"><span>Resolved</span><strong>{moderationStats.resolved}</strong><small>Action completed</small></div>
            </section>
            <section className="moderation-workspace">
              <section className="panel moderation-create">
                <div><span className="eyebrow">REPORT INTAKE</span><h3>Log a safety report</h3></div>
                <form onSubmit={createReport}>
                  <label>Reporter<input value={reportForm.reporter} onChange={e=>setReportForm({...reportForm,reporter:e.target.value})} placeholder="Customer / HOWDI ID" /></label>
                  <label>Reported target<input value={reportForm.target} onChange={e=>setReportForm({...reportForm,target:e.target.value})} placeholder="User, post, group or message reference" /></label>
                  <div className="moderation-form-grid"><label>Target type<select value={reportForm.targetType} onChange={e=>setReportForm({...reportForm,targetType:e.target.value})}><option value="user">User</option><option value="chat">Chat / Message</option><option value="post">Vibe Post</option><option value="group">Group</option><option value="channel">Channel</option><option value="space">Space</option></select></label><label>Reason<input value={reportForm.reason} onChange={e=>setReportForm({...reportForm,reason:e.target.value})} placeholder="Spam, abuse, safety..." /></label></div>
   <label>
  Details
  <textarea
    rows={4}
    value={reportForm.details}
    onChange={(e) =>
      setReportForm({
        ...reportForm,
        details: e.target.value,
      })
    }
    placeholder="Optional moderation notes or evidence reference"
  />
</label>
                  <button className="primary" type="submit">Add to moderation queue</button>
                </form>
                <div className="moderation-policy-note"><strong>Foundation controls</strong><span>Block, mute, report, review, restrict and resolve. Private-message encryption architecture must remain separate from moderation workflow design.</span></div>
              </section>
              <section className="panel moderation-list-panel">
                <div className="list-head moderation-list-head"><div><span className="eyebrow">MODERATION QUEUE</span><h3>{filteredReports.length} of {reports.length} reports</h3></div><div className="moderation-filters"><select value={reportStatusFilter} onChange={e=>setReportStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select><input className="search" value={reportSearch} onChange={e=>setReportSearch(e.target.value)} placeholder="Report, user, target..." /></div></div>
                <div className="moderation-list">{filteredReports.map(report=><article key={report.id} className={`moderation-item ${selectedReport?.id===report.id?'selected':''}`} onClick={()=>setSelectedReport(report)}><div className="moderation-icon">🛡️</div><div className="moderation-copy"><strong>{report.reason}</strong><p>{report.targetType} · {report.target} · reported by {report.reporter}</p><small>{report.id} · {new Date(report.createdAt).toLocaleString('en-IN')}</small></div><div className="moderation-actions"><span className={`moderation-status ${report.status}`}>{report.status}</span><button onClick={e=>{e.stopPropagation();setSelectedReport(report)}}>Review</button></div></article>)}{filteredReports.length===0&&<div className="empty-state">🛡️ No reports match your filters. Future HOWDI Connect reports will appear here once the social backend is connected.</div>}</div>
                {selectedReport && <aside className="moderation-detail"><div><span className="eyebrow">REPORT REVIEW</span><h3>{selectedReport.id}</h3></div><button onClick={()=>setSelectedReport(null)}>×</button><p><strong>{selectedReport.reason}</strong><br/>{selectedReport.details||'No additional details provided.'}</p><div className="moderation-detail-grid"><label>Status<select value={selectedReport.status} onChange={e=>updateReport({...selectedReport,status:e.target.value})}><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></label><label>Action<select value={selectedReport.action} onChange={e=>updateReport({...selectedReport,action:e.target.value})}><option value="pending">Pending</option><option value="warned">Warned</option><option value="content_removed">Content removed</option><option value="restricted">Restricted</option><option value="suspended">Suspended</option><option value="no_action">No action</option></select></label></div><small>Every production moderation action should later create a backend audit record with the actor, timestamp, reason and affected entity.</small></aside>}
              </section>
            </section>
          </div>
        )}

        {tab==='works' && (
          <div className="page works-page works-control-v2">
            <section className="ops-hero">
              <div><span className="eyebrow">HOWDI WORKS CONTROL TOWER</span><h2>Workers, jobs, safety and trust — in one command centre.</h2><p>Control onboarding, KYC, service mapping, work matching, acceptance, active jobs, safety incidents and audit history without losing transparency between customer, worker and HOWDI.</p></div>
              <div className="ops-hero-stats"><span><b>{workerStats.active}</b>active workers</span><span><b>{workStats.open}</b>open jobs</span><span className={safetyIncidents.filter(x=>x.status==='open').length?'attention':''}><b>{safetyIncidents.filter(x=>x.status==='open').length}</b>safety alerts</span></div>
            </section>

            <section className="works-section-tabs">
              {[
                ['overview','Overview'],['bookings','Works Bookings & Cases'],['applications','Worker Applications'],['workers','Workers'],['kyc','KYC & Documents'],['services','Service Catalogue'],['mapping','Worker ↔ Service'],['requests','Work Requests'],['matching','Matching & Offers'],['active','Active Jobs'],['safety','Safety & SOS'],['audit','Audit Trail']
              ].map(([id,label])=><button key={id} className={worksSection===id?'active':''} onClick={()=>setWorksSection(id)}>{label}</button>)}
            </section>

            {worksSection==='bookings'&&<div className="works-bookings-admin">
              <section className="ops-stat-grid works-booking-kpis">
                <article><small>ALL BOOKINGS</small><b>{worksBookingStats.total}</b><span>Customer Works bookings</span></article>
                <article><small>ACTIVE JOBS</small><b>{worksBookingStats.active}</b><span>Still in lifecycle</span></article>
                <article><small>COMPLETED</small><b>{worksBookingStats.completed}</b><span>Completed / confirmed</span></article>
                <article className={worksBookingStats.openCases?'case-attention':''}><small>OPEN CASES</small><b>{worksBookingStats.openCases}</b><span>Dispute / safety / support</span></article>
              </section>
              <section className="panel works-bookings-panel">
                <div className="list-head"><div><span className="eyebrow">WORKS BOOKINGS CONTROL</span><h3>Bookings, disputes and customer confirmations</h3><p>Separate from Shopping Orders. This view reads the live HOWDI Works booking lifecycle from PostgreSQL.</p></div><button className="admin-ghost" onClick={loadWorksBookings}>↻ Refresh</button></div>
                <div className="works-booking-toolbar">
                  <input className="search" value={worksBookingSearch} onChange={e=>setWorksBookingSearch(e.target.value)} placeholder="Search Work ID, customer, worker, service..."/>
                  <select value={worksBookingFilter} onChange={e=>setWorksBookingFilter(e.target.value)}><option value="all">All bookings</option><option value="active">Active</option><option value="completed">Completed</option><option value="cases">Open cases</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select>
                </div>
                {worksBookingsLoading&&<div className="empty-state">Loading live Works bookings…</div>}
                {!worksBookingsLoading&&<div className="works-booking-list">{filteredWorksBookings.map(item=><button key={item.workCode} className={`works-booking-row ${Number(item.openCaseCount||0)>0?'has-case':''}`} onClick={()=>openWorksBooking(item)}>
                  <div className="works-booking-id"><b>{item.workCode}</b><span>{item.serviceName||item.title||'HOWDI Works'}</span><small>{item.city||'—'} {item.pincode||''}</small></div>
                  <div><small>CUSTOMER</small><b>{item.customer?.name||'Customer'}</b><span>{item.customer?.phone||'—'}</span></div>
                  <div><small>WORKER</small><b>{item.worker?.name||'Not assigned'}</b><span>{item.worker?.workerCode||'—'}</span></div>
                  <div><small>STATUS</small><em className={`ops-status ${String(item.status||'open').replaceAll('_','-')}`}>{String(item.status||'open').replaceAll('_',' ')}</em><span>PIN {item.pinVerified?'verified':'pending'}</span></div>
                  <div><small>PAYMENT</small><b>{item.payment?.status||'Not created'}</b><span>{item.payment?.amount?formatOrderAmount(item.payment.amount):'—'}</span></div>
                  <div className="case-cell"><small>CASES</small><b>{Number(item.openCaseCount||0)}</b><span>{Number(item.openCaseCount||0)?'Needs attention':'Clear'}</span></div>
                  <strong>View →</strong>
                </button>)}</div>}
                {!worksBookingsLoading&&!filteredWorksBookings.length&&<div className="empty-state">No Works bookings match this filter.</div>}
              </section>
            </div>}

            {worksSection==='overview'&&<>
              <section className="ops-stat-grid works-overview-kpis">
                <article><small>TOTAL WORKERS</small><b>{workerStats.total}</b><span>{workerStats.verified} fully verified</span></article>
                <article><small>KYC PENDING</small><b>{workerStats.kycPending}</b><span>Needs document review</span></article>
                <article><small>OPEN WORK</small><b>{workStats.open}</b><span>Waiting for matching</span></article>
                <article><small>ACTIVE SAFETY</small><b>{safetyIncidents.filter(x=>x.status==='open').length}</b><span>Requires immediate attention</span></article>
              </section>

              <section className="works-command-grid">
                <article className="panel works-command-card"><span>👷</span><div><small>WORKERS</small><h3>Onboarding & eligibility</h3><p>KYC, skill verification, account state, service radius and availability.</p><button onClick={()=>setWorksSection('workers')}>Open workers →</button></div></article>
                <article className="panel works-command-card"><span>🧩</span><div><small>SERVICES</small><h3>Dynamic customer catalogue</h3><p>Add new services here and map approved workers without frontend code changes.</p><button onClick={()=>setWorksSection('services')}>Manage services →</button></div></article>
                <article className="panel works-command-card"><span>🎯</span><div><small>MATCHING</small><h3>Offer only to eligible workers</h3><p>Active + KYC verified + skill verified + service mapped workers only.</p><button onClick={()=>setWorksSection('matching')}>Open matching →</button></div></article>
                <article className="panel works-command-card danger-lite"><span>🚨</span><div><small>SAFETY</small><h3>Protect both sides</h3><p>Customer SOS, worker SOS, incident status and preserved job context.</p><button onClick={()=>setWorksSection('safety')}>Open safety →</button></div></article>
              </section>

              <section className="panel works-lifecycle">
                <div className="list-head"><div><span className="eyebrow">LOCKED JOB LIFECYCLE</span><h3>Every transition leaves a trace.</h3></div></div>
                <div className="lifecycle-flow">{['Request','Validate','Match','Offer','Accept / Reject','Start journey','Arrive','Job PIN','Work started','Approved changes','Complete','Confirm','Settle','Rate','Close'].map((x,i)=><div key={x}><b>{String(i+1).padStart(2,'0')}</b><span>{x}</span></div>)}</div>
              </section>
            </>}

            {worksSection==='applications'&&(
              <div className="application-control-page">
                <section className="panel application-hero"><div><span className="eyebrow">WORKER APPLICATIONS</span><h3>People ready to work with HOWDI.</h3><p>Applications arrive automatically from the customer website. Approval creates a Worker record, but KYC, skill verification, service mapping and activation remain controlled by HOWDI.</p></div><div className="application-count">{workerApplications.filter(x=>x.status==='new').length}<small>new</small></div></section>
                <section className="panel application-list whatsapp-assist-inbox">
                  <div className="list-head"><div><span className="eyebrow">WHATSAPP ASSIST</span><h3>{whatsappWorkerLeads.length} assistance leads</h3><p>People who could not complete the form and asked HOWDI for WhatsApp help.</p></div></div>
                  <div className="ops-list">
                    {whatsappWorkerLeads.map(item=><article key={item.id}><div className="ops-icon">💬</div><div className="ops-main"><strong>{item.fullName||'Worker applicant'}</strong><span>{item.leadCode} · {item.phone}</span><small>{item.claimedSkill||'Skill not selected'} · {item.city||'City not provided'} · {item.source.replaceAll('_',' ')}</small></div><div className="ops-value"><b>{item.status}</b><span>{item.createdAt?new Date(item.createdAt).toLocaleString():''}</span></div><div className="ops-actions">{item.status==='new'&&<button className="primary" onClick={()=>updateWhatsappWorkerLead(item,'contacted')}>Mark contacted</button>}{item.status!=='closed'&&<button onClick={()=>updateWhatsappWorkerLead(item,'closed')}>Close</button>}</div></article>)}
                    {!whatsappWorkerLeads.length&&<div className="empty-state">💬 No WhatsApp assistance requests yet.</div>}
                  </div>
                </section>
                <section className="panel application-list"><div className="list-head"><div><span className="eyebrow">APPLICATION INBOX</span><h3>{workerApplications.length} worker applications</h3></div></div><div className="ops-list">
                  {workerApplications.map(item=><article key={item.id} className="worker-app-card">
                    <div className="ops-icon">👷</div>
                    <div className="ops-main">
                      <strong>{item.fullName}</strong>
                      <span>{item.applicationCode} · {item.phone} · {item.city}{item.state?`, ${item.state}`:''}</span>
                      <small>{item.gender||'—'} · Age {item.age||'—'} · {item.engagementIntent?.replaceAll('_',' ')||'individual worker'}</small>
                      <small>{item.claimedSkill} · {item.experienceYears} yrs · {item.employmentType?.replaceAll('_',' ')} · {item.workingDays?.join(', ')}</small>
                      <div className="worker-app-facts">
                        <span>⏱ {item.availableFrom||'—'}–{item.availableTo||'—'}</span>
                        <span>₹/hr {item.hourlyRateMin||0}–{item.hourlyRateMax||0}</span>
                        <span>₹/day {item.dailyRateMin||0}–{item.dailyRateMax||0}</span>
                        <span>📍 {item.serviceRadiusKm||0} km</span>
                        <span>{item.emergencyJobs?'🚨 Emergency':'Standard jobs'}</span>
                        <span>{item.ownVehicle?'🚗 Own vehicle':'No vehicle declared'}</span>
                      </div>
                      <div className="worker-app-docs">
                        <b>KYC: {item.kycDocumentType||'—'} ••••{item.kycIdLast4||'—'}</b>
                        <span>{item.profilePhotoFile?'✓ Profile photo':'○ Profile photo'}</span>
                        <span>{item.liveSelfieFile?'✓ Live selfie':'○ Live selfie'}</span>
                        <span>{item.kycDocumentFile?'✓ KYC document':'○ KYC document'}</span>
                        <span>{item.certificateFile?'✓ Certificate':'○ Certificate'}</span>
                        <span>{item.experienceFile?'✓ Experience proof':'○ Experience proof'}</span>
                      </div>
                    </div>
                    <div className="ops-value"><b>{item.status.replaceAll('_',' ')}</b><span>{item.convertedWorkerId?'Worker record created':'Application only'}</span></div>
                    <div className="ops-actions">
                      {item.status==='new'&&<button onClick={()=>reviewWorkerApplication(item,'in_review')}>Review</button>}
                      {!item.convertedWorkerId&&item.status!=='rejected'&&<button className="primary" onClick={()=>reviewWorkerApplication(item,'approved')}>Approve</button>}
                      {!item.convertedWorkerId&&item.status!=='rejected'&&<button className="danger-button" onClick={()=>reviewWorkerApplication(item,'rejected')}>Reject</button>}
                      {item.convertedWorkerId&&<button onClick={()=>setWorksSection('workers')}>Open Workers</button>}
                    </div>
                  </article>)}
                  {!workerApplications.length&&<div className="empty-state">👷 No worker applications yet. New applications will appear here automatically.</div>}
                </div></section>
              </div>
            )}

            {worksSection==='workers'&&<>
              <section className="ops-stat-grid"><article><small>TOTAL</small><b>{workerStats.total}</b><span>Worker records</span></article><article><small>VERIFIED</small><b>{workerStats.verified}</b><span>KYC + skill cleared</span></article><article><small>ACTIVE</small><b>{workerStats.active}</b><span>Eligible account state</span></article><article><small>ONLINE</small><b>{workerStats.online}</b><span>Available now</span></article></section>
              <section className="ops-workspace">
                <form className="panel ops-editor" onSubmit={saveWorker}>
                  <div className="list-head"><div><span className="eyebrow">{editingWorker?'EDIT WORKER':'WORKER ONBOARDING'}</span><h3>{editingWorker?'Update worker':'Create worker record'}</h3></div></div>
                  <div className="ops-two-col">
                    <label>Full name *<input value={workerForm.fullName} onChange={e=>setWorkerForm({...workerForm,fullName:e.target.value})}/></label>
                    <label>Phone *<input value={workerForm.phone} onChange={e=>setWorkerForm({...workerForm,phone:e.target.value})}/></label>
                    <label>Email<input value={workerForm.email} onChange={e=>setWorkerForm({...workerForm,email:e.target.value})}/></label>
                    <label>City<input value={workerForm.city} onChange={e=>setWorkerForm({...workerForm,city:e.target.value})}/></label>
                    <label>Pincode<input maxLength="6" value={workerForm.pincode} onChange={e=>setWorkerForm({...workerForm,pincode:e.target.value})}/></label>
                    <label>Requested / claimed skill<select value={workerForm.requestedSkill} onChange={e=>setWorkerForm({...workerForm,requestedSkill:e.target.value})}>{workServices.map(s=><option key={s.id}>{s.name}</option>)}</select><small className="field-help">Worker-declared skill only. Final Primary Service is assigned after verification in Worker ↔ Service Mapping.</small></label>
                    <label>Experience years<input type="number" min="0" value={workerForm.experienceYears} onChange={e=>setWorkerForm({...workerForm,experienceYears:e.target.value})}/></label>
                    <label>Service radius km<input type="number" min="0" value={workerForm.serviceRadiusKm} onChange={e=>setWorkerForm({...workerForm,serviceRadiusKm:e.target.value})}/></label>
                    <label>Starting price ₹<input type="number" min="0" value={workerForm.startingPrice} onChange={e=>setWorkerForm({...workerForm,startingPrice:e.target.value})}/></label>
                    <label>KYC status<select value={workerForm.kycStatus} onChange={e=>setWorkerForm({...workerForm,kycStatus:e.target.value})}><option value="pending">Pending</option><option value="in_review">In review</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></label>
                    <label>Skill status<select value={workerForm.skillStatus} onChange={e=>setWorkerForm({...workerForm,skillStatus:e.target.value})}><option value="pending">Pending</option><option value="in_review">In review</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></label>
                    <label>Account status<select value={workerForm.accountStatus} onChange={e=>setWorkerForm({...workerForm,accountStatus:e.target.value})}><option value="registered">Registered</option><option value="under_review">Under review</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option><option value="inactive">Inactive</option><option value="rejected">Rejected</option></select></label>
                    <label>Availability<select value={workerForm.availability} onChange={e=>setWorkerForm({...workerForm,availability:e.target.value})}><option value="offline">Offline</option><option value="online">Online</option><option value="busy">Busy</option><option value="on_job">On job</option></select></label>
                  </div>
                  <label className="check"><input type="checkbox" checked={workerForm.active} onChange={e=>setWorkerForm({...workerForm,active:e.target.checked})}/> Worker record active</label>
                  <div className="actions"><button className="primary">{editingWorker?'Update worker':'Create worker'}</button>{editingWorker&&<button type="button" onClick={resetWorkerForm}>Cancel</button>}</div>
                </form>
                <section className="panel ops-list-panel">
                  <div className="list-head ops-list-head"><div><span className="eyebrow">WORKER DIRECTORY</span><h3>{filteredWorkers.length} of {workers.length} workers</h3></div><div className="ops-filters"><select value={workerStatusFilter} onChange={e=>setWorkerStatusFilter(e.target.value)}><option value="all">All states</option><option value="active">Active</option><option value="pending">Pending KYC</option><option value="verified">Verified</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option></select><input className="search" value={workerSearch} onChange={e=>setWorkerSearch(e.target.value)} placeholder="Search worker, phone, service..."/></div></div>
                  <div className="ops-list worker-directory">{filteredWorkers.map(item=><article className={selectedWorker?.id===item.id?'selected':''} key={item.id}><div className="ops-icon worker-avatar">{String(item.fullName||'W').slice(0,1)}</div><div className="ops-main"><strong>{item.fullName}</strong><span>{item.workerCode} · Primary: {primaryServiceFor(item.id)?.name||'Not assigned'}</span><small>{item.city||'City pending'} · {item.experienceYears||0} yrs · Claimed: {item.requestedSkill||'—'} · KYC {item.kycStatus} · Skill {item.skillStatus}</small></div><div className="ops-value"><b>₹{Number(item.startingPrice||0).toLocaleString('en-IN')} start</b><span className={`ops-status ${item.accountStatus}`}>{item.accountStatus.replaceAll('_',' ')}</span></div><div className="ops-actions"><button onClick={()=>setSelectedWorker(item)}>View</button><button onClick={()=>editWorker(item)}>Edit</button><button className="danger-button" onClick={()=>deleteWorker(item)}>Delete</button></div></article>)}{!filteredWorkers.length&&<div className="empty-state">👷 No workers onboarded yet.</div>}</div>
                </section>
              </section>
              {selectedWorker&&<section className="panel worker-detail-card">
                <div className="ops-detail-head"><div><span className="eyebrow">WORKER CONTROL</span><h3>{selectedWorker.fullName}</h3><p>{selectedWorker.workerCode} · {selectedWorker.phone}</p></div><button className="ops-close" onClick={()=>setSelectedWorker(null)}>×</button></div>
                <div className="ops-detail-grid"><div><small>KYC</small><b>{selectedWorker.kycStatus}</b></div><div><small>SKILL</small><b>{selectedWorker.skillStatus}</b></div><div><small>ACCOUNT</small><b>{selectedWorker.accountStatus}</b></div><div><small>PRIMARY SERVICE</small><b>{primaryServiceFor(selectedWorker.id)?.name||'Not assigned'}</b></div></div>
                <div className="worker-control-actions"><select value={selectedWorker.kycStatus} onChange={e=>updateWorkerStatus(selectedWorker,'kycStatus',e.target.value)}><option value="pending">KYC pending</option><option value="in_review">KYC in review</option><option value="verified">KYC verified</option><option value="rejected">KYC rejected</option></select><select value={selectedWorker.skillStatus} onChange={e=>updateWorkerStatus(selectedWorker,'skillStatus',e.target.value)}><option value="pending">Skill pending</option><option value="in_review">Skill in review</option><option value="verified">Skill verified</option><option value="rejected">Skill rejected</option></select><select value={selectedWorker.accountStatus} onChange={e=>updateWorkerStatus(selectedWorker,'accountStatus',e.target.value)}><option value="registered">Registered</option><option value="under_review">Under review</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option><option value="inactive">Inactive</option><option value="rejected">Rejected</option></select></div>
                <div className="ops-production-note"><b>Eligibility rule</b><span>A worker should receive work only after required KYC is verified, skill verification is cleared, account is active and at least one service mapping is approved.</span></div>
              </section>}
            </>}

            {worksSection==='kyc'&&<section className="panel works-module-panel">
              <div className="list-head"><div><span className="eyebrow">KYC & DOCUMENT STORAGE VISIBILITY</span><h3>Received documents, review state and access control.</h3><p>Store only document references/metadata in this UI foundation. Sensitive document bytes require secure backend storage and restricted access.</p></div></div>
              <div className="kyc-worker-grid">{workers.map(worker=><article key={worker.id}><div className="kyc-head"><div className="ops-icon worker-avatar">{String(worker.fullName||'W').slice(0,1)}</div><div><b>{worker.fullName}</b><span>{worker.workerCode}</span><small>KYC {worker.kycStatus} · Account {worker.accountStatus}</small></div></div><div className="kyc-doc-buttons">{['Identity Proof','Address Proof','Profile Photo','PAN / Tax','Bank Proof','Skill Certificate'].map(type=><button key={type} onClick={()=>addWorkerDocument(worker.id,type)}>+ {type}</button>)}</div><div className="kyc-doc-list">{workerDocuments.filter(d=>d.workerId===worker.id).map(doc=><div key={doc.id}><span>📄</span><div><b>{doc.type}</b><small>{doc.fileName} · received {new Date(doc.receivedAt).toLocaleString()}</small></div><em className={`ops-status ${doc.status}`}>{doc.status}</em><button onClick={()=>reviewWorkerDocument(doc,'verified')}>Verify</button><button onClick={()=>reviewWorkerDocument(doc,'rejected')}>Reject</button></div>)}</div></article>)}</div>
              {!workers.length&&<div className="empty-state">Add a worker first, then KYC documents can be tracked here.</div>}
            </section>}

            {worksSection==='services'&&<section className="ops-workspace">
              <form className="panel ops-editor" onSubmit={saveService}>
                <div className="list-head"><div><span className="eyebrow">{editingService?'EDIT SERVICE':'SERVICE CATALOGUE'}</span><h3>{editingService?'Update customer service':'Add a new Works service'}</h3></div></div>
                <label>Service name *<input value={serviceForm.name} onChange={e=>setServiceForm({...serviceForm,name:e.target.value})} placeholder="Example: Solar Panel Technician"/></label>
                <div className="ops-two-col"><label>Icon<input value={serviceForm.icon} onChange={e=>setServiceForm({...serviceForm,icon:e.target.value})}/></label><label>Sort order<input type="number" min="1" value={serviceForm.sortOrder} onChange={e=>setServiceForm({...serviceForm,sortOrder:e.target.value})}/></label></div>
                <label>Description<textarea value={serviceForm.description} onChange={e=>setServiceForm({...serviceForm,description:e.target.value})}/></label>
                <label className="check"><input type="checkbox" checked={serviceForm.visible} onChange={e=>setServiceForm({...serviceForm,visible:e.target.checked})}/> Visible on customer Works website</label>
                <label className="check"><input type="checkbox" checked={serviceForm.active} onChange={e=>setServiceForm({...serviceForm,active:e.target.checked})}/> Service active</label>
                <div className="actions"><button className="primary">{editingService?'Update service':'Create service'}</button>{editingService&&<button type="button" onClick={resetServiceForm}>Cancel</button>}</div>
              </form>
              <section className="panel service-catalogue-panel"><div className="list-head"><div><span className="eyebrow">CUSTOMER-FACING SERVICES</span><h3>{workServices.length} services</h3></div></div><div className="service-cards">{[...workServices].sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)).map(item=><article key={item.id}><i>{item.icon}</i><div><b>{item.name}</b><span>{item.description}</span><small>{item.visible?'Visible to customers':'Hidden'} · {item.active?'Active':'Inactive'}</small></div><div><button onClick={()=>toggleService(item,'visible')}>{item.visible?'Hide':'Show'}</button><button onClick={()=>editService(item)}>Edit</button><button className="danger-button" onClick={()=>deleteService(item)}>Delete</button></div></article>)}</div></section>
            </section>}

            {worksSection==='mapping'&&<section className="panel works-module-panel worker-service-map-v2">
              <div className="list-head"><div><span className="eyebrow">WORKER ↔ SERVICE MAPPING</span><h3>Approve services and choose one Primary Service.</h3><p>The worker's claimed skill is only onboarding information. Customer visibility comes only from Admin-approved service mappings. One approved service can be marked Primary.</p></div></div>
              <div className="mapping-rules"><span>1. Verify KYC</span><span>2. Verify skill</span><span>3. Approve service</span><span>4. Make one service Primary</span><span>5. Activate worker</span></div>
              <div className="mapping-table">
                {workers.map(worker=>{
                  const primary=primaryServiceFor(worker.id);
                  const eligibleBase=worker.kycStatus==='verified'&&worker.skillStatus==='verified';
                  return <article key={worker.id} className={!eligibleBase?'mapping-review-needed':''}>
                    <div className="mapping-worker">
                      <div className="ops-icon worker-avatar">{String(worker.fullName||'W').slice(0,1)}</div>
                      <div>
                        <b>{worker.fullName}</b>
                        <span>{worker.workerCode} · Claimed skill: {worker.requestedSkill||'—'}</span>
                        <small>KYC {worker.kycStatus} · Skill {worker.skillStatus} · Account {worker.accountStatus}</small>
                      </div>
                      <div className="primary-service-summary"><small>PRIMARY SERVICE</small><b>{primary?`${primary.icon} ${primary.name}`:'Not assigned'}</b></div>
                    </div>
                    {!eligibleBase&&<div className="mapping-warning">Complete KYC and skill verification before activating this worker for customer jobs.</div>}
                    <div className="mapping-services-v2">
                      {workServices.filter(s=>s.active!==false).map(service=>{
                        const map=workerServiceMappings.find(m=>String(m.workerId)===String(worker.id)&&String(m.serviceId)===String(service.id));
                        const approved=!!map;
                        const isPrimary=!!map?.primary;
                        return <div className={`service-map-row ${approved?'approved':''} ${isPrimary?'primary':''}`} key={service.id}>
                          <div className="service-map-name"><i>{service.icon}</i><div><b>{service.name}</b><small>{service.visible?'Customer visible service':'Hidden from customer catalogue'}</small></div></div>
                          <span className={`ops-status ${approved?'active':'pending'}`}>{approved?'APPROVED':'NOT MAPPED'}</span>
                          <div className="service-map-actions">
                            <button className={approved?'mapped':''} onClick={()=>toggleWorkerService(worker.id,service.id)}>{approved?'Remove':'Approve'}</button>
                            <button disabled={!approved||isPrimary} className={isPrimary?'primary-action active':''} onClick={()=>makePrimaryWorkerService(worker.id,service.id)}>{isPrimary?'Primary ✓':'Make Primary'}</button>
                          </div>
                        </div>
                      })}
                    </div>
                  </article>
                })}
              </div>
              {!workers.length&&<div className="empty-state">No workers available for mapping.</div>}
              <div className="ops-production-note"><b>Customer visibility rule</b><span>A worker should appear under a customer service only when that service mapping is approved. Primary Service controls the worker's customer homepage identity. Additional approved services remain eligible for job matching, but do not duplicate the worker across homepage service cards.</span></div>
            </section>}

            {worksSection==='requests'&&<>
              <section className="ops-stat-grid"><article><small>TOTAL WORK</small><b>{workStats.total}</b><span>All requests</span></article><article><small>OPEN</small><b>{workStats.open}</b><span>Needs matching</span></article><article><small>ASSIGNED</small><b>{workStats.assigned}</b><span>Offer / assignment stage</span></article><article><small>COMPLETED</small><b>{workStats.completed}</b><span>Finished work</span></article></section>
              <section className="ops-workspace">
                <form className="panel ops-editor" onSubmit={saveWork}>
                  <div className="list-head"><div><span className="eyebrow">{editingWork?'EDIT WORK':'CREATE WORK REQUEST'}</span><h3>{editingWork?'Update work request':'Customer work order foundation'}</h3></div></div>
                  <label>Work title *<input value={workForm.title} onChange={e=>setWorkForm({...workForm,title:e.target.value})}/></label>
                  <div className="ops-two-col">
                    <label>Service<select value={workForm.category} onChange={e=>setWorkForm({...workForm,category:e.target.value})}>{workServices.filter(s=>s.active!==false).map(s=><option key={s.id}>{s.name}</option>)}</select></label>
                    <label>Work type<select value={workForm.workType} onChange={e=>setWorkForm({...workForm,workType:e.target.value})}><option value="one_time">One-time</option><option value="daily">Daily work</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="recurring">Recurring</option></select></label>
                    <label>City *<input value={workForm.city} onChange={e=>setWorkForm({...workForm,city:e.target.value})}/></label><label>Pincode<input maxLength="6" value={workForm.pincode} onChange={e=>setWorkForm({...workForm,pincode:e.target.value})}/></label>
                    <label>Budget ₹<input type="number" min="0" value={workForm.budget} onChange={e=>setWorkForm({...workForm,budget:e.target.value})}/></label><label>Schedule<input type="date" value={workForm.scheduleDate} onChange={e=>setWorkForm({...workForm,scheduleDate:e.target.value})}/></label>
                  </div>
                  <label>Skills / job tags<input value={workForm.skills} onChange={e=>setWorkForm({...workForm,skills:e.target.value})}/></label><label>Description<textarea value={workForm.description} onChange={e=>setWorkForm({...workForm,description:e.target.value})}/></label>
                  <div className="actions"><button className="primary">{editingWork?'Update request':'Create request'}</button>{editingWork&&<button type="button" onClick={resetWorkForm}>Cancel</button>}</div>
                </form>
                <section className="panel ops-list-panel"><div className="list-head ops-list-head"><div><span className="eyebrow">WORK REQUEST QUEUE</span><h3>{filteredWorks.length} of {works.length}</h3></div><div className="ops-filters"><select value={workStatusFilter} onChange={e=>setWorkStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><input className="search" value={workSearch} onChange={e=>setWorkSearch(e.target.value)} placeholder="Search job, city, service..."/></div></div><div className="ops-list">{filteredWorks.map(item=><article className={selectedWork?.id===item.id?'selected':''} key={item.id}><div className="ops-icon">🛠️</div><div className="ops-main"><strong>{item.title}</strong><span>{item.workCode||item.id} · {item.category} · {item.city}</span><small>{item.scheduleDate||'Flexible date'} · {item.skills||'No tags'}</small></div><div className="ops-value"><b>{formatOrderAmount(item.budget||0)}</b><span className={`ops-status ${item.status}`}>{item.status.replaceAll('_',' ')}</span></div><div className="ops-actions"><button onClick={()=>setSelectedWork(item)}>View</button><button onClick={()=>editWork(item)}>Edit</button><button className="danger-button" onClick={()=>deleteWork(item)}>Delete</button></div></article>)}{!filteredWorks.length&&<div className="empty-state">No work requests yet.</div>}</div></section>
              </section>
            </>}

            {worksSection==='matching'&&<section className="panel works-module-panel">
              <div className="list-head"><div><span className="eyebrow">MATCHING & WORK OFFERS</span><h3>Offer jobs only to eligible workers.</h3><p>Eligibility = KYC verified + skill verified + active account + approved mapping for the requested service. Primary mapping is not required for secondary-skill job matching.</p></div></div>
              <div className="matching-grid">{works.filter(w=>['open','assigned'].includes(w.status)).map(work=><article key={work.id}><div className="match-job"><span className="eyebrow">JOB</span><h4>{work.title}</h4><p>{work.workCode||work.id} · {work.category} · {work.city} · {formatOrderAmount(work.budget)}</p></div><div className="eligible-workers">{eligibleWorkersForWork(work).map(worker=><div key={worker.id}><div><b>{worker.fullName}</b><span>{(mappedServices(worker.id).find(s=>workerServiceMappings.some(m=>m.workerId===worker.id&&m.serviceId===s.id&&m.primary))?.name || worker.requestedSkill || 'Unmapped')} · {worker.city||'Location pending'} · ₹{worker.startingPrice} start</span><small>{mappedServices(worker.id).map(s=>s.name).join(', ')||'No mapped services'}</small></div><button onClick={()=>sendWorkOffer(work,worker)}>Send offer</button></div>)}{!eligibleWorkersForWork(work).length&&<div className="empty-state">No eligible worker for this service yet.</div>}</div></article>)}</div>
              {!works.filter(w=>['open','assigned'].includes(w.status)).length&&<div className="empty-state">No open work requires matching.</div>}
            </section>}

            {worksSection==='active'&&<section className="panel works-module-panel works-live-ops">
              <div className="list-head"><div><span className="eyebrow">LIVE JOB OPERATIONS</span><h3>Accepted → En route → Arrived → PIN → Working → Complete.</h3><p>Location is job-scoped: HOWDI tracks only during the accepted active journey, not all day.</p></div><span className={`live-journey-count ${liveJourneys.length?'live':''}`}>{liveJourneys.length} live</span></div>
              <div className="journey-board">
                {liveJourneys.map(item=><article key={item.id} className="journey-card">
                  <div className="journey-card-top">
                    <div><span className="eyebrow">{item.workCode}</span><h4>{item.title}</h4><p>{item.serviceName} · {item.city}{item.pincode?` ${item.pincode}`:''}</p></div>
                    <span className={`journey-stage ${item.stage}`}>{item.stage.replaceAll('_',' ')}</span>
                  </div>
                  <div className="journey-worker"><div className="journey-avatar">{(item.workerName||'W').slice(0,1).toUpperCase()}</div><div><b>{item.workerName}</b><span>{item.workerCode} · ★ {Number(item.workerRating||0).toFixed(1)}</span></div><div className="journey-eta"><b>{item.etaMinutes!=null?`${item.etaMinutes} min`:'—'}</b><span>ETA</span></div></div>
                  <div className="journey-timeline">
                    {['accepted','en_route','arrived','in_progress','completed'].map((stage,idx)=>{const order=['accepted','en_route','arrived','in_progress','completed','customer_confirmed','checked_out','closed'];const done=order.indexOf(item.stage)>=order.indexOf(stage);return <div key={stage} className={done?'done':''}><i>{done?'✓':idx+1}</i><span>{stage==='in_progress'?'Working':stage.replaceAll('_',' ')}</span></div>})}
                  </div>
                  <div className="journey-location">
                    <div><b>📍 Last permitted location</b><span>{item.lastLatitude!=null?`${item.lastLatitude.toFixed(5)}, ${item.lastLongitude.toFixed(5)}`:'Waiting for worker location'}</span><small>{item.lastLocationAt?`Updated ${new Date(item.lastLocationAt).toLocaleString()}`:'Location sharing starts with the job journey'}</small></div>
                    <div><b>🔐 Job PIN</b><span>{item.pinVerified?'Verified ✓':'Not verified'}</span></div>
                  </div>
                  {!item.pinVerified&&item.stage==='arrived'&&<div className="journey-pin-row"><input maxLength="6" placeholder="Customer Job PIN" value={journeyPinInput[item.workId]||''} onChange={e=>setJourneyPinInput(prev=>({...prev,[item.workId]:e.target.value.replace(/\D/g,'')}))}/><button onClick={()=>verifyJourneyPin(item)}>Verify PIN</button></div>}
                  <div className="journey-actions">
                    {item.stage==='accepted'&&<button className="primary" onClick={()=>updateJourneyStage(item,'en_route')}>Start journey</button>}
                    {item.stage==='en_route'&&<button className="primary" onClick={()=>updateJourneyStage(item,'arrived')}>Mark arrived</button>}
                    {item.stage==='arrived'&&item.pinVerified&&<button className="primary" onClick={()=>updateJourneyStage(item,'in_progress')}>Start work</button>}
                    {item.stage==='in_progress'&&<button className="primary" onClick={()=>updateJourneyStage(item,'completed')}>Complete work</button>}
                    {item.stage==='completed'&&<button onClick={()=>updateJourneyStage(item,'customer_confirmed')}>Customer confirmed</button>}
                    {item.stage==='customer_confirmed'&&<button onClick={()=>updateJourneyStage(item,'checked_out')}>Check out</button>}
                    {item.stage==='checked_out'&&<button onClick={()=>updateJourneyStage(item,'closed')}>Close job</button>}
                    <button onClick={()=>{const work=works.find(w=>w.id===item.workId),worker=workers.find(w=>w.id===item.workerId);createSafetyIncident('worker',work,worker,'Worker feels unsafe')}}>SOS</button>
                  </div>
                </article>)}
              </div>
              {!liveJourneys.length&&<div className="empty-state">No accepted jobs are being tracked. A journey is created automatically when an offer is accepted.</div>}
              <div className="ops-production-note"><b>Tracking foundation is backend-controlled</b><span>Main Tower can operate the journey now. HOWDI Worker will later send Start Journey, Arrived, GPS and completion events directly; customer tracking reads the same backend journey.</span></div>
            </section>}

            {worksSection==='safety'&&<section className="panel works-module-panel safety-control">
              <div className="list-head"><div><span className="eyebrow">SAFETY & SOS</span><h3>Protect customer, worker and HOWDI with one incident record.</h3><p>Critical events must preserve job, worker, customer, timing, permitted location context, actions and resolution.</p></div><span className={`safety-open-count ${safetyIncidents.filter(x=>x.status==='open').length?'live':''}`}>{safetyIncidents.filter(x=>x.status==='open').length} open</span></div>
              <div className="safety-list">{safetyIncidents.map(item=>{const work=works.find(w=>w.id===item.workId),worker=workers.find(w=>w.id===item.workerId);return <article key={item.id}><div className="sos-mark">SOS</div><div><b>{item.reason}</b><span>{item.id} · {item.party} side · {work?.title||item.workId||'No work'} · {worker?.fullName||item.workerId||'No worker'}</span><small>{item.lastLocation} · {new Date(item.createdAt).toLocaleString()} · assigned {item.assignedTo}</small></div><span className={`ops-status ${item.status}`}>{item.status}</span><select value={item.status} onChange={e=>updateSafetyIncident(item,e.target.value)}><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></article>})}</div>
              {!safetyIncidents.length&&<div className="empty-state">🛡️ No safety incidents recorded.</div>}
              <div className="safety-policy-grid"><article><b>Customer protection</b><span>Assigned-worker identity, Job PIN, pricing approvals, report/SOS and incident history.</span></article><article><b>Worker protection</b><span>Accept/reject transparency, controlled address reveal, job-based location, emergency exit and SOS.</span></article><article><b>HOWDI protection</b><span>Immutable lifecycle events, approval history, payment references, evidence metadata and audit trail.</span></article></div>
            </section>}

            {worksSection==='audit'&&<section className="panel works-module-panel">
              <div className="list-head"><div><span className="eyebrow">WORKS AUDIT TRAIL</span><h3>Recent controlled events</h3><p>Production should move these records to append-only backend audit tables with actor IDs and request metadata.</p></div></div>
              <div className="works-audit-list">{worksAudit.map(item=><article key={`${item.type}-${item.id}`}><span>•</span><div><b>{item.type}</b><small>{item.detail}</small></div><time>{item.when?new Date(item.when).toLocaleString():'—'}</time></article>)}</div>
              {!worksAudit.length&&<div className="empty-state">No Works audit events yet.</div>}
            </section>}
          </div>
        )}

        {tab==='works'&&selectedWorksBooking&&<div className="works-booking-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setSelectedWorksBooking(null);setSelectedWorksBookingDetail(null);}}}>
          <section className="works-booking-modal">
            <div className="works-booking-modal-head"><div><span className="eyebrow">WORKS BOOKING DETAIL</span><h2>{selectedWorksBooking.workCode}</h2><p>{selectedWorksBooking.serviceName||selectedWorksBooking.title||'HOWDI Works'} · {String(selectedWorksBooking.status||'open').replaceAll('_',' ')}</p></div><button onClick={()=>{setSelectedWorksBooking(null);setSelectedWorksBookingDetail(null);}}>×</button></div>
            <div className="works-detail-grid">
              <article><small>CUSTOMER</small><b>{selectedWorksBooking.customer?.name||'Customer'}</b><span>{selectedWorksBooking.customer?.phone||'—'}</span></article>
              <article><small>WORKER</small><b>{selectedWorksBooking.worker?.name||'Not assigned'}</b><span>{selectedWorksBooking.worker?.workerCode||'—'}</span></article>
              <article><small>PAYMENT</small><b>{selectedWorksBooking.payment?.status||'Not created'}</b><span>{selectedWorksBooking.payment?.amount?formatOrderAmount(selectedWorksBooking.payment.amount):'—'}</span></article>
              <article><small>REVIEW</small><b>{selectedWorksBooking.review?`${selectedWorksBooking.review.rating}/5`:'Not submitted'}</b><span>{selectedWorksBooking.review?.review||'—'}</span></article>
            </div>
            <section className="works-case-detail"><div className="list-head"><div><span className="eyebrow">CASES / DISPUTES</span><h3>{selectedWorksBookingDetail?.lifecycle?.cases?.length||0} case records</h3></div></div>
              {!selectedWorksBookingDetail&&<div className="empty-state">Loading booking lifecycle…</div>}
              {selectedWorksBookingDetail&&!(selectedWorksBookingDetail.lifecycle?.cases||[]).length&&<div className="empty-state">No dispute, safety, refund or support case for this booking.</div>}
              <div className="works-case-list">{(selectedWorksBookingDetail?.lifecycle?.cases||[]).map(c=><article key={c.case_code||c.id} className={`works-case-card ${c.case_type||'support'}`}><div><small>{String(c.case_type||'case').toUpperCase()}</small><b>{c.case_code||`CASE-${c.id}`}</b><p>{c.reason||'No reason supplied'}</p></div><div><em className={`ops-status ${c.status||'open'}`}>{String(c.status||'open').replaceAll('_',' ')}</em><span>Priority: {c.priority||'normal'}</span><span>{c.created_at?new Date(c.created_at).toLocaleString():'—'}</span></div></article>)}</div>
            </section>
            <section className="works-lifecycle-detail"><span className="eyebrow">JOB LIFECYCLE</span><div className="works-time-grid">{Object.entries(selectedWorksBooking.timestamps||{}).map(([key,value])=><div key={key}><small>{key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}</small><b>{value?new Date(value).toLocaleString():'—'}</b></div>)}</div></section>
          </section>
        </div>}

        {tab==='vendors' && (
          <div className="page vendors-page">
            <section className="ops-hero">
              <div><span className="eyebrow">HOWDI VENDOR NETWORK</span><h2>Creators and sellers, onboarded with control.</h2><p>One vendor record for identity, business information, compliance, payout readiness and catalogue permissions.</p></div>
              <div className="ops-hero-stats"><span><b>{vendorStats.pending}</b>pending</span><span><b>{vendorStats.active}</b>active</span><span><b>{vendorStats.blocked}</b>restricted</span></div>
            </section>
            <section className="panel application-list vendor-application-inbox">
              <div className="list-head"><div><span className="eyebrow">VENDOR APPLICATIONS</span><h3>{vendorApplications.length} incoming applications</h3><p>“Become a Vendor” applications from the customer website appear here automatically.</p></div></div>
              <div className="ops-list">
                {vendorApplications.map(item=><article key={item.id}><div className="ops-icon">🏪</div><div className="ops-main"><strong>{item.businessName}</strong><span>{item.applicationCode} · {item.ownerName} · {item.phone}</span><small>{item.category} · {item.city}{item.state?`, ${item.state}`:''} · {item.businessType}</small></div><div className="ops-value"><b>{item.status.replaceAll('_',' ')}</b><span>{item.convertedVendorId?'Vendor record created':'Application only'}</span></div><div className="ops-actions">{item.status==='new'&&<button onClick={()=>reviewVendorApplication(item,'in_review')}>Review</button>}{!item.convertedVendorId&&item.status!=='rejected'&&<button className="primary" onClick={()=>reviewVendorApplication(item,'approved')}>Approve</button>}{!item.convertedVendorId&&item.status!=='rejected'&&<button className="danger-button" onClick={()=>reviewVendorApplication(item,'rejected')}>Reject</button>}</div></article>)}
                {!vendorApplications.length&&<div className="empty-state">🏪 No vendor applications yet.</div>}
              </div>
            </section>
            <section className="ops-stat-grid">
              <article><small>TOTAL VENDORS</small><b>{vendorStats.total}</b><span>All onboarding records</span></article><article><small>PENDING</small><b>{vendorStats.pending}</b><span>Needs review</span></article><article><small>ACTIVE</small><b>{vendorStats.active}</b><span>Approved vendors</span></article><article><small>RESTRICTED</small><b>{vendorStats.blocked}</b><span>Suspended / rejected</span></article>
            </section>
            <section className="ops-workspace">
              <form className="panel ops-editor" onSubmit={saveVendor}>
                <div className="list-head"><div><span className="eyebrow">{editingVendor?'EDIT VENDOR':'VENDOR ONBOARDING'}</span><h3>{editingVendor?'Update vendor':'Create vendor record'}</h3></div></div>
                <div className="ops-two-col">
                  <label>Business name *<input value={vendorForm.businessName} onChange={e=>setVendorForm({...vendorForm,businessName:e.target.value})}/></label><label>Owner / creator *<input value={vendorForm.ownerName} onChange={e=>setVendorForm({...vendorForm,ownerName:e.target.value})}/></label>
                  <label>Phone *<input value={vendorForm.phone} onChange={e=>setVendorForm({...vendorForm,phone:e.target.value})}/></label><label>Email<input type="email" value={vendorForm.email} onChange={e=>setVendorForm({...vendorForm,email:e.target.value})}/></label>
                  <label>Business type<select value={vendorForm.businessType} onChange={e=>setVendorForm({...vendorForm,businessType:e.target.value})}><option>Individual Creator</option><option>Proprietorship</option><option>Partnership</option><option>Private Limited</option><option>SHG / Collective</option><option>NGO / Social Enterprise</option></select></label>
                  <label>Primary category<select value={vendorForm.category} onChange={e=>setVendorForm({...vendorForm,category:e.target.value})}><option>Crochet & Handmade</option><option>Textiles & Craft</option><option>Home & Living</option><option>Food & Local Products</option><option>Services</option><option>Other</option></select></label>
                  <label>City<input value={vendorForm.city} onChange={e=>setVendorForm({...vendorForm,city:e.target.value})}/></label><label>State<input value={vendorForm.state} onChange={e=>setVendorForm({...vendorForm,state:e.target.value})}/></label>
                  <label>Pincode<input value={vendorForm.pincode} onChange={e=>setVendorForm({...vendorForm,pincode:e.target.value})} maxLength="6"/></label><label>GSTIN<input value={vendorForm.gstin} onChange={e=>setVendorForm({...vendorForm,gstin:e.target.value.toUpperCase()})}/></label>
                  <label>PAN<input value={vendorForm.pan} onChange={e=>setVendorForm({...vendorForm,pan:e.target.value.toUpperCase()})}/></label><label>KYC status<select value={vendorForm.kycStatus} onChange={e=>setVendorForm({...vendorForm,kycStatus:e.target.value})}><option value="pending">Pending</option><option value="in_review">In review</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></label>
                  <label>Payout status<select value={vendorForm.payoutStatus} onChange={e=>setVendorForm({...vendorForm,payoutStatus:e.target.value})}><option value="not_connected">Not connected</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="on_hold">On hold</option></select></label><label>Vendor status<select value={vendorForm.status} onChange={e=>setVendorForm({...vendorForm,status:e.target.value})}><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option><option value="rejected">Rejected</option></select></label>
                </div>
                <label className="check"><input type="checkbox" checked={vendorForm.catalogueAccess} onChange={e=>setVendorForm({...vendorForm,catalogueAccess:e.target.checked})}/> Catalogue access enabled</label><label className="check"><input type="checkbox" checked={vendorForm.active} onChange={e=>setVendorForm({...vendorForm,active:e.target.checked})}/> Vendor record active</label>
                <div className="actions"><button className="primary">{editingVendor?'Update vendor':'Create vendor'}</button>{editingVendor&&<button type="button" onClick={resetVendorForm}>Cancel</button>}</div>
              </form>
              <section className="panel ops-list-panel">
                <div className="list-head ops-list-head"><div><span className="eyebrow">VENDOR DIRECTORY</span><h3>{filteredVendors.length} of {vendors.length} vendors</h3></div><div className="ops-filters"><select value={vendorStatusFilter} onChange={e=>setVendorStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option><option value="rejected">Rejected</option></select><input className="search" value={vendorSearch} onChange={e=>setVendorSearch(e.target.value)} placeholder="Search vendor, owner, GSTIN..."/></div></div>
                <div className="ops-list">{filteredVendors.map(item=><article className={selectedVendor?.id===item.id?'selected':''} key={item.id}><div className="ops-icon">🤝</div><div className="ops-main"><strong>{item.businessName}</strong><span>{item.vendorCode} · {item.ownerName}</span><small>{item.category} · {[item.city,item.state].filter(Boolean).join(', ')||'Location pending'} · KYC {item.kycStatus.replaceAll('_',' ')}</small></div><div className="ops-value"><b>{item.catalogueAccess?'Catalogue ON':'Catalogue OFF'}</b><span className={`ops-status ${item.status}`}>{item.status}</span></div><div className="ops-actions"><button onClick={()=>setSelectedVendor(item)}>View</button><button onClick={()=>editVendor(item)}>Edit</button><button className="danger-button" onClick={()=>deleteVendor(item)}>Delete</button></div></article>)}{!filteredVendors.length&&<div className="empty-state">🤝 No vendors yet.</div>}</div>
              </section>
            </section>
            {selectedVendor&&<section className="panel ops-detail"><div className="ops-detail-head"><div><span className="eyebrow">VENDOR DETAIL</span><h3>{selectedVendor.businessName}</h3><p>{selectedVendor.vendorCode} · {selectedVendor.ownerName}</p></div><button className="ops-close" onClick={()=>setSelectedVendor(null)}>×</button></div><div className="ops-detail-grid"><div><small>STATUS</small><b>{selectedVendor.status}</b></div><div><small>KYC</small><b>{selectedVendor.kycStatus.replaceAll('_',' ')}</b></div><div><small>PAYOUT</small><b>{selectedVendor.payoutStatus.replaceAll('_',' ')}</b></div><div><small>CATALOGUE</small><b>{selectedVendor.catalogueAccess?'Enabled':'Disabled'}</b></div></div><div className="vendor-contact-grid"><div><small>CONTACT</small><b>{selectedVendor.phone}</b><span>{selectedVendor.email||'No email'}</span></div><div><small>BUSINESS</small><b>{selectedVendor.businessType}</b><span>{selectedVendor.category}</span></div><div><small>LOCATION</small><b>{[selectedVendor.city,selectedVendor.state].filter(Boolean).join(', ')||'Pending'}</b><span>{selectedVendor.pincode||'No pincode'}</span></div><div><small>TAX ID</small><b>{selectedVendor.gstin||'GSTIN not added'}</b><span>{selectedVendor.pan||'PAN not added'}</span></div></div><div className="ops-detail-actions"><select value={selectedVendor.status} onChange={e=>updateVendorStatus(selectedVendor,e.target.value)}><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option><option value="rejected">Rejected</option></select><button onClick={()=>toggleVendorCatalogue(selectedVendor)}>{selectedVendor.catalogueAccess?'Disable catalogue':'Enable catalogue'}</button><button onClick={()=>editVendor(selectedVendor)}>Edit vendor</button></div><div className="ops-production-note"><b>Production boundary</b><span>Vendor KYC, bank verification, GST validation, agreements, catalogue ownership and payouts must be enforced by backend APIs and compliance checks.</span></div></section>}
          </div>
        )}

        
        {tab==='learnEarn' && (
          <div className={`page learn-earn-page le-clean-admin le-view-${learnAdminView}`}>
            <section className="learn-earn-hero">
              <div>
                <span className="eyebrow">HOWDI LEARN & EARN · CROCHET FIRST</span>
                <h2>Feel like Grandma is teaching you. 🧶</h2>
                <p>Build warm, step-by-step crochet learning journeys that end with a real handmade project, certificate and optional HPay earning eligibility.</p>
              </div>
              <div className="learn-earn-hero-stats">
                <span><b>{learnCourses.length}</b>courses</span>
                <span><b>{learnCourses.filter(x=>x.publish_status==='PUBLISHED').length}</b>published</span>
                <span><b>{learnCourses.reduce((n,x)=>n+Number(x.enrollment_count||0),0)}</b>learners</span>
              </div>
              <div className="le-admin-command">
                <div className="le-admin-command-copy">
                  <b>Learn & Earn Control Center</b>
                  <span>Open one workspace at a time. No more endless admin scrolling.</span>
                </div>
                <button onClick={()=>setLearnAdminView('compensation')}>₹ Open Compensation</button>
              </div>
            </section>

            <nav className="le-admin-tabs" aria-label="Learn and Earn admin sections">
              {[
                ['overview','⌂','Overview'],
                ['teachers','👩‍🏫','Teachers'],
                ['compensation','₹','Compensation'],
                ['courses','▦','Courses & AI'],
                ['learners','◉','Learner Access'],
                ['opportunities','↗','Opportunities'],
                ['finance','₹','Finance'],
                ['governance','✓','Governance']
              ].map(([key,icon,label])=>
                <button key={key} className={learnAdminView===key?'active':''} onClick={()=>setLearnAdminView(key)}>
                  <span>{icon}</span><b>{label}</b>
                </button>
              )}
            </nav>

            {learnAdminView==='overview'&&(
              <section className="le-admin-overview">
                <div className="le-admin-overview-head">
                  <div><span className="eyebrow">ADMIN HOME</span><h3>Everything important, without the noise.</h3><p>Choose a workspace above. Existing Learn & Earn controls are preserved, only reorganized.</p></div>
                  <button onClick={()=>{loadTeacherFoundation();loadLearnEarnCourses();loadV2006Compensation();}}>↻ Refresh overview</button>
                </div>
                <div className="le-admin-kpis">
                  <article><small>TEACHERS</small><b>{Number(teacherFoundation.summary?.total||0)}</b><span>{Number(teacherFoundation.summary?.approved||0)} approved</span></article>
                  <article><small>COURSES</small><b>{learnCourses.length}</b><span>{learnCourses.filter(x=>x.publish_status==='PUBLISHED').length} published</span></article>
                  <article><small>LEARNERS</small><b>{learnCourses.reduce((n,x)=>n+Number(x.enrollment_count||0),0)}</b><span>Across Learn & Earn</span></article>
                  <article><small>COMPENSATION</small><b>{v2006Comp.length}</b><span>Teacher agreements</span></article>
                </div>
                <div className="le-admin-workspace-grid">
                  {[
                    ['teachers','👩‍🏫','Teacher Operations','Identity, KYC, approval and teacher readiness.'],
                    ['compensation','₹','Teacher Compensation','Agreements, completed delivery and governed earning handoff.'],
                    ['courses','▦','Courses & AI','Course studio, commerce and reviewed AI teaching content.'],
                    ['learners','◉','Learner Access','Entitlements, access health and learner controls.'],
                    ['opportunities','↗','Opportunity Engine','Market signals, matching, jobs and partner bridges.'],
                    ['finance','₹','Finance & Payouts','Earnings, settlements, statements, disputes and HPay controls.'],
                    ['governance','✓','Governance & Readiness','Security, quality, completion gates and final readiness.']
                  ].map(([key,icon,title,copy])=>
                    <button key={key} onClick={()=>setLearnAdminView(key)}>
                      <span className="le-admin-workspace-icon">{icon}</span>
                      <span><b>{title}</b><small>{copy}</small></span>
                      <em>Open →</em>
                    </button>
                  )}
                </div>
              </section>
            )}

            <section className="panel teacher-foundation-admin">
              <div className="teacher-foundation-head">
                <div><span className="eyebrow">V19.1B · TEACHER IDENTITY + ONBOARDING</span><h3>Teacher Identity, KYC, HPay & Approval</h3><p>One HOWDI identity. Review profile readiness, verify KYC and payout readiness, then approve the teacher for Learn & Earn.</p></div>
                <button className="secondary" onClick={loadTeacherFoundation} disabled={teacherFoundationBusy}>{teacherFoundationBusy?'Loading…':'Refresh teachers'}</button>
              </div>
              <div className="teacher-foundation-stats">
                <article><small>Total</small><b>{Number(teacherFoundation.summary?.total||0)}</b></article>
                <article><small>Submitted</small><b>{Number(teacherFoundation.summary?.submitted||0)}</b></article>
                <article><small>Under review</small><b>{Number(teacherFoundation.summary?.under_review||0)}</b></article>
                <article><small>Approved</small><b>{Number(teacherFoundation.summary?.approved||0)}</b></article>
                <article><small>Changes required</small><b>{Number(teacherFoundation.summary?.changes_required||0)}</b></article>
              </div>
              <div className="teacher-foundation-tools">
                <input placeholder="Search teacher, HOWDI ID, skill, language…" value={teacherFoundationSearch} onChange={e=>setTeacherFoundationSearch(e.target.value)}/>
                <select value={teacherFoundationFilter} onChange={e=>setTeacherFoundationFilter(e.target.value)}><option>ALL</option><option>SUBMITTED</option><option>UNDER_REVIEW</option><option>APPROVED</option><option>CHANGES_REQUIRED</option><option>REJECTED</option><option>SUSPENDED</option></select>
              </div>
              <div className="teacher-foundation-list">
                {(teacherFoundation.teachers||[]).filter(t=>teacherFoundationFilter==='ALL'||t.application_status===teacherFoundationFilter).filter(t=>{const q=teacherFoundationSearch.trim().toLowerCase();return !q||[t.display_name,t.full_name,t.howdi_id,t.email,...(t.skills||[]),...(t.languages||[])].filter(Boolean).join(' ').toLowerCase().includes(q)}).map(t=><article key={t.id} className="teacher-foundation-row">
                  <div className="teacher-foundation-person"><span className="teacher-avatar">👩‍🏫</span><div><b>{t.display_name||t.full_name||'Teacher applicant'}</b><small>{t.howdi_id||'HOWDI ID pending'} · {t.email||t.phone||'No contact'}</small><small>{(t.skills||[]).join(' · ')||'Skills not added'} · {(t.languages||[]).join(', ')||'Language not added'}</small></div></div>
                  <div className="teacher-foundation-meta"><span>{Number(t.experience_years||0)} yrs exp.</span><span>{Number(t.assigned_courses||0)} courses</span><span>KYC {String(t.kyc_status||'NOT_SUBMITTED').replaceAll('_',' ')}</span><span>HPay {String(t.payout_status||'NOT_CONNECTED').replaceAll('_',' ')}</span></div>
                  <em className={`teacher-status ${String(t.application_status||'DRAFT').toLowerCase().replaceAll('_','-')}`}>{String(t.application_status||'DRAFT').replaceAll('_',' ')}</em>
                  <div className="teacher-foundation-actions">
                    {t.kyc_status==='PENDING'&&<button className="secondary" onClick={()=>teacherComplianceAction(t,'kyc','verify')}>Verify KYC</button>}
                    {t.kyc_status==='PENDING'&&<button className="secondary" onClick={()=>teacherComplianceAction(t,'kyc','fail')}>Fail KYC</button>}
                    {t.payout_status==='PENDING'&&<button className="secondary" onClick={()=>teacherComplianceAction(t,'payout','ready')}>Payout ready</button>}
                    {t.payout_status==='PENDING'&&<button className="secondary" onClick={()=>teacherComplianceAction(t,'payout','hold')}>Payout hold</button>}
                    {t.application_status==='SUBMITTED'&&<button className="secondary" onClick={()=>teacherFoundationAction(t,'review')}>Start review</button>}
                    {['SUBMITTED','UNDER_REVIEW','CHANGES_REQUIRED'].includes(t.application_status)&&<button disabled={t.kyc_status!=='VERIFIED'||t.payout_status!=='READY'} title={t.kyc_status!=='VERIFIED'||t.payout_status!=='READY'?'Verify KYC and payout first':'Approve teacher'} onClick={()=>teacherFoundationAction(t,'approve')}>Approve</button>}
                    {['SUBMITTED','UNDER_REVIEW'].includes(t.application_status)&&<button className="secondary" onClick={()=>teacherFoundationAction(t,'changes-required')}>Request changes</button>}
                    {t.application_status!=='REJECTED'&&t.application_status!=='APPROVED'&&<button className="danger-button" onClick={()=>teacherFoundationAction(t,'reject')}>Reject</button>}
                    {t.application_status==='APPROVED'&&<button className="secondary" onClick={()=>teacherFoundationAction(t,'suspend')}>Suspend</button>}
                  </div>
                </article>)}
                {!teacherFoundationBusy&&!(teacherFoundation.teachers||[]).length&&<div className="learn-empty">No teacher applications yet. Teacher self-onboarding is now ready through the HOWDI identity session.</div>}
              </div>
              <div className="teacher-v191-boundary"><b>V19.1B boundary</b><span>Identity · profile · KYC/payout references · admin verification · learning modes · resources. Full availability, demos, group batches, 1:1 booking, attendance and session lifecycle remain reserved for V19.2.</span></div>
            </section>

            <section className="panel teacher-dispute-adjustments-v1923">
              <div className="dispute-adjust-head">
                <div><span className="eyebrow">V19.23 · GOVERNED FINANCE CORRECTIONS</span><h3>Resolved teacher disputes → HPay adjustment journal.</h3><p>No historical payout is edited directly. Every correction starts as DRAFT and follows the existing finance review → approval → posting lifecycle.</p></div>
                <button onClick={loadTeacherDisputeAdjustments} disabled={teacherDisputeAdjustmentBusy}>↻ Refresh</button>
              </div>

              <div className="dispute-adjust-kpis">
                <article><small>Resolved / unlinked</small><b>{teacherDisputeAdjustments.summary?.resolved_unlinked||0}</b></article>
                <article><small>Draft</small><b>{teacherDisputeAdjustments.summary?.draft||0}</b></article>
                <article><small>Approved</small><b>{teacherDisputeAdjustments.summary?.approved||0}</b></article>
                <article><small>Posted</small><b>{teacherDisputeAdjustments.summary?.posted||0}</b></article>
              </div>

              {teacherDisputeAdjustmentDraft.case_id&&<div className="dispute-adjust-builder">
                <div><span className="eyebrow">NEW DRAFT ADJUSTMENT</span><h4>Case #{teacherDisputeAdjustmentDraft.case_id}</h4></div>
                <label>Closed finance period<select value={teacherDisputeAdjustmentDraft.original_close_id} onChange={e=>setTeacherDisputeAdjustmentDraft(v=>({...v,original_close_id:e.target.value}))}><option value="">Select closed period</option>{(teacherDisputeAdjustments.closed_periods||[]).map(x=><option key={x.id} value={x.id}>{x.close_number} · {String(x.period_start).slice(0,10)} → {String(x.period_end).slice(0,10)}</option>)}</select></label>
                <label>Adjustment type<select value={teacherDisputeAdjustmentDraft.adjustment_type} onChange={e=>setTeacherDisputeAdjustmentDraft(v=>({...v,adjustment_type:e.target.value}))}><option>CORRECTION</option><option>REVERSAL</option><option>MANUAL_CREDIT</option><option>MANUAL_DEBIT</option><option>ROUNDING</option></select></label>
                <label>Amount (+ credit / − debit)<input type="number" step="0.01" value={teacherDisputeAdjustmentDraft.amount} onChange={e=>setTeacherDisputeAdjustmentDraft(v=>({...v,amount:e.target.value}))}/></label>
                <label className="reason">Reason<textarea value={teacherDisputeAdjustmentDraft.reason} onChange={e=>setTeacherDisputeAdjustmentDraft(v=>({...v,reason:e.target.value}))}/></label>
                <div className="builder-actions"><button className="secondary" onClick={()=>setTeacherDisputeAdjustmentDraft({case_id:null,original_close_id:'',adjustment_type:'CORRECTION',amount:'',reason:''})}>Cancel</button><button onClick={createTeacherDisputeAdjustment} disabled={teacherDisputeAdjustmentBusy}>Create DRAFT Adjustment →</button></div>
              </div>}

              <div className="dispute-adjust-list">
                {(teacherDisputeAdjustments.cases||[]).map(x=><article key={x.case_id}>
                  <div><b>{x.full_name}</b><small>{x.howdi_id||'—'} · {x.case_number} · {x.statement_month}</small></div>
                  <div><b>{x.case_status}</b><small>{x.resolution||'No resolution recorded'}</small></div>
                  <div>{x.adjustment_id?<><b>{x.adjustment_number}</b><small>{x.adjustment_type} · ₹{Number(x.amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})} · {x.close_number||'—'}</small></>:<><b>No adjustment</b><small>Ledger unchanged</small></>}</div>
                  <div><span className={`finance-adjust-state ${String(x.adjustment_status||'UNLINKED').toLowerCase()}`}>{x.adjustment_status||'UNLINKED'}</span></div>
                  <div className="dispute-adjust-actions">
                    {x.case_status==='RESOLVED'&&!x.adjustment_id&&<button onClick={()=>startTeacherDisputeAdjustment(x)}>Create Adjustment</button>}
                    {x.adjustment_status==='DRAFT'&&<button onClick={()=>transitionTeacherDisputeAdjustment(x,'review')}>Review</button>}
                    {x.adjustment_status==='REVIEWED'&&<button onClick={()=>transitionTeacherDisputeAdjustment(x,'approve')}>Approve</button>}
                    {x.adjustment_status==='APPROVED'&&<button onClick={()=>transitionTeacherDisputeAdjustment(x,'post')}>Post</button>}
                    {['DRAFT','REVIEWED'].includes(x.adjustment_status)&&<button className="secondary" onClick={()=>transitionTeacherDisputeAdjustment(x,'cancel')}>Cancel</button>}
                  </div>
                </article>)}
                {!teacherDisputeAdjustmentBusy&&!(teacherDisputeAdjustments.cases||[]).length&&<div className="teacher-statements-empty">No teacher dispute cases yet.</div>}
              </div>

              <div className="dispute-adjust-policy"><span>🔐</span><p><b>Correction ≠ direct balance edit.</b> Posted adjustments are journal entries in the current open accounting period. V19.23 never rewrites a closed period and never calls a bank/provider.</p></div>
            </section>

            <section className="panel teacher-dispute-analytics-v1928">
              <div className="dispute-analytics-head">
                <div><span className="eyebrow">V19.28 · DISPUTE OPERATIONS ANALYTICS</span><h3>Aging, resolution speed and owner workload.</h3><p>Operational metrics only. No financial values or case statuses are changed here.</p></div>
                <button onClick={loadTeacherCaseAnalytics} disabled={teacherCaseAnalyticsBusy}>{teacherCaseAnalyticsBusy?'Refreshing…':'↻ Refresh Analytics'}</button>
              </div>
              <div className="dispute-analytics-kpis">
                <article><small>Open</small><b>{teacherCaseAnalytics.summary?.open||0}</b></article>
                <article><small>Under review</small><b>{teacherCaseAnalytics.summary?.under_review||0}</b></article>
                <article><small>Overdue</small><b>{teacherCaseAnalytics.summary?.overdue||0}</b></article>
                <article><small>Critical</small><b>{teacherCaseAnalytics.summary?.critical_open||0}</b></article>
                <article><small>Avg resolution</small><b>{Number(teacherCaseAnalytics.summary?.avg_resolution_hours||0).toFixed(1)}h</b></article>
                <article><small>Median resolution</small><b>{Number(teacherCaseAnalytics.summary?.median_resolution_hours||0).toFixed(1)}h</b></article>
              </div>
              <div className="dispute-analytics-grid">
                <article><span className="eyebrow">ACTIVE CASE AGING</span><div className="aging-bars">
                  <div><b>&lt;24h</b><strong>{teacherCaseAnalytics.aging?.under_24h||0}</strong></div>
                  <div><b>24–48h</b><strong>{teacherCaseAnalytics.aging?.h24_48||0}</strong></div>
                  <div><b>48–72h</b><strong>{teacherCaseAnalytics.aging?.h48_72||0}</strong></div>
                  <div><b>72h+</b><strong>{teacherCaseAnalytics.aging?.over_72h||0}</strong></div>
                </div></article>
                <article><span className="eyebrow">OWNER WORKLOAD</span><div className="owner-load-list">{(teacherCaseAnalytics.owner_load||[]).map(x=><div key={x.owner}><b>{x.owner}</b><span>{x.active_cases} active · {x.overdue_cases} overdue · {x.critical_cases} critical</span></div>)}{!(teacherCaseAnalytics.owner_load||[]).length&&<small>No active disputes.</small>}</div></article>
              </div>
            </section>

            <section className="panel v1933-ops">
              <div className="v1933-head"><div><span className="eyebrow">V19.30–V19.33 · DISPUTE OPS</span><h3>Classification, read tracking, templates & resolution quality.</h3></div><button onClick={loadV1933Ops}>↻ Refresh</button></div>
              <div className="v1933-kpis"><article><small>Teacher rating</small><b>{Number(v1933Quality.quality?.avg_rating||0).toFixed(1)}/5</b></article><article><small>Feedback</small><b>{v1933Quality.quality?.feedback_count||0}</b></article><article><small>Positive</small><b>{v1933Quality.quality?.positive||0}</b></article><article><small>Needs attention</small><b>{v1933Quality.quality?.negative||0}</b></article></div>
              <div className="v1933-grid"><article><b>Quick reply templates</b>{v1933Templates.map(x=><button key={x.id} onClick={()=>useV1933Template(x)}><strong>{x.title}</strong><small>{x.template_type} · {x.category||'GENERAL'}</small><span>{x.body}</span></button>)}</article><article><b>Top root causes</b>{(v1933Quality.taxonomy||[]).map((x,i)=><div key={i}><strong>{x.category}</strong><span>{x.root_cause} · {x.cases} case(s)</span></div>)}</article></div>
              {v1933Taxonomy.id&&<div className="v1933-classify"><b>Classify case #{v1933Taxonomy.id}</b><select value={v1933Taxonomy.category} onChange={e=>setV1933Taxonomy(v=>({...v,category:e.target.value}))}><option>GENERAL</option><option>MISSING_EARNING</option><option>AMOUNT_MISMATCH</option><option>SETTLEMENT</option><option>PAYOUT</option><option>PAYMENT_REFERENCE</option><option>OTHER</option></select><input value={v1933Taxonomy.root_cause} onChange={e=>setV1933Taxonomy(v=>({...v,root_cause:e.target.value.toUpperCase()}))} placeholder="Root cause"/><select value={v1933Taxonomy.impact_level} onChange={e=>setV1933Taxonomy(v=>({...v,impact_level:e.target.value}))}><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>CRITICAL</option></select><input value={v1933Taxonomy.tags} onChange={e=>setV1933Taxonomy(v=>({...v,tags:e.target.value}))} placeholder="tags, comma separated"/><button onClick={saveV1933Taxonomy}>Save</button></div>}
            </section>

            <section className="panel v1937-governance">
              <div className="v1937-head"><div><span className="eyebrow">V19.34–V19.37 · CASE GOVERNANCE</span><h3>Evidence, closure readiness, audit packs & duplicate detection.</h3></div><button onClick={loadV1937Duplicates}>↻ Refresh</button></div>
              <div className="v1937-kpis"><article><small>Duplicate candidates</small><b>{v1937Duplicates.length}</b></article><article><small>Evidence case</small><b>{v1937Evidence.case_id?`#${v1937Evidence.case_id}`:'—'}</b></article><article><small>Closure case</small><b>{v1937Closure?.case_id?`#${v1937Closure.case_id}`:'—'}</b></article><article><small>Audit format</small><b>JSON</b></article></div>
              {!!v1937Duplicates.length&&<div className="v1937-dupes">{v1937Duplicates.slice(0,8).map(x=><article key={x.id}><b>{x.full_name}</b><span>{x.case_number} ↔ {x.duplicate_of_number}</span><small>{Number(x.duplicate_score||0).toFixed(0)}% · {x.category||'GENERAL'}</small><div className="v1941-dupe-actions"><button onClick={()=>resolveDuplicateCase(x,'CONFIRMED_DUPLICATE')}>Confirm</button><button onClick={()=>resolveDuplicateCase(x,'NOT_DUPLICATE')}>Not Duplicate</button></div></article>)}</div>}
              {v1937Evidence.case_id&&<div className="v1937-box"><div><b>Evidence · Case #{v1937Evidence.case_id}</b><button onClick={()=>setV1937Evidence({case_id:null,items:[]})}>Close</button></div><div>{v1937Evidence.items.map(x=><article key={x.id}><b>{x.title}</b><small>{x.added_by_type} · {x.reference_code||'No code'}</small><span>{x.note||x.reference_url||'—'}</span></article>)}</div><div className="v1937-form"><input value={v1937EvidenceForm.title} onChange={e=>setV1937EvidenceForm(v=>({...v,title:e.target.value}))} placeholder="Evidence title"/><input value={v1937EvidenceForm.reference_code} onChange={e=>setV1937EvidenceForm(v=>({...v,reference_code:e.target.value}))} placeholder="Reference code"/><input value={v1937EvidenceForm.reference_url} onChange={e=>setV1937EvidenceForm(v=>({...v,reference_url:e.target.value}))} placeholder="Optional URL"/><textarea value={v1937EvidenceForm.note} onChange={e=>setV1937EvidenceForm(v=>({...v,note:e.target.value}))} placeholder="Note"/><button onClick={addV1937Evidence}>Add</button></div></div>}
              {v1937Closure?.case_id&&<div className="v1937-box"><div><b>Closure · Case #{v1937Closure.case_id}</b><button onClick={()=>setV1937Closure(null)}>Close</button></div><div className="v1937-checks">{Object.entries(v1937Closure.checks||{}).map(([k,v])=><span className={v?'ok':'bad'} key={k}>{v?'✓':'×'} {k.replaceAll('_',' ')}</span>)}</div><strong>{v1937Closure.ready?'READY':'NOT READY'}</strong><button onClick={verifyV1937Closure} disabled={!v1937Closure.ready}>Verify Closure</button></div>}
              {v1941Followups.case_id&&<div className="v1941-box"><div><b>Follow-ups · Case #{v1941Followups.case_id}</b><button onClick={()=>setV1941Followups({case_id:null,items:[]})}>Close</button></div><div className="v1941-followup-list">{v1941Followups.items.map(x=><article key={x.id}><b>{new Date(x.due_at).toLocaleString('en-IN')}</b><span>{x.note}</span><small>{x.status}</small>{x.status==='PENDING'&&<div><button onClick={()=>updateV1941Followup(x,'done')}>Done</button><button onClick={()=>updateV1941Followup(x,'cancel')}>Cancel</button></div>}</article>)}</div><div className="v1941-followup-form"><input type="datetime-local" value={v1941FollowupForm.due_at} onChange={e=>setV1941FollowupForm(v=>({...v,due_at:e.target.value}))}/><input value={v1941FollowupForm.note} onChange={e=>setV1941FollowupForm(v=>({...v,note:e.target.value}))} placeholder="Follow-up note"/><button onClick={addV1941Followup}>Schedule</button></div></div>}
              {v1941Impact&&<div className="v1941-box"><div><b>Finance Impact · {v1941Impact.case_number}</b><button onClick={()=>setV1941Impact(null)}>Close</button></div>{v1941Impact.linked_adjustment?<div className="v1941-impact"><article><small>Adjustment</small><b>{v1941Impact.linked_adjustment.adjustment_number}</b></article><article><small>Direction</small><b>{v1941Impact.impact.direction}</b></article><article><small>Amount</small><b>₹{Number(v1941Impact.impact.absolute_amount||0).toLocaleString('en-IN')}</b></article><article><small>Status</small><b>{v1941Impact.linked_adjustment.status}</b></article></div>:<div className="teacher-statements-empty">No finance adjustment linked to this case.</div>}<p>Preview only — closed historical statements remain unchanged and no bank/payment action occurs here.</p></div>}
            </section>

            <section className="panel v1945-governance">
              <div className="v1945-head"><div><span className="eyebrow">V19.42–V19.45 · CASE GOVERNANCE</span><h3>Follow-up queue, reopen review, collaborators & high-impact closure approval.</h3></div><button onClick={loadV1945Governance}>↻ Refresh</button></div>
              <div className="v1945-kpis"><article><small>Pending follow-ups</small><b>{v1945FollowupQueue.summary?.total||0}</b></article><article><small>Overdue</small><b>{v1945FollowupQueue.summary?.overdue||0}</b></article><article><small>Due ≤24h</small><b>{v1945FollowupQueue.summary?.due_24h||0}</b></article><article><small>Pending reopen</small><b>{v1945ReopenRequests.filter(x=>x.status==='PENDING').length}</b></article></div>
              <div className="v1945-grid"><article><b>Follow-up Queue</b>{(v1945FollowupQueue.followups||[]).slice(0,8).map(x=><div key={x.id} className={x.overdue?'late':''}><strong>{x.full_name}</strong><span>{x.case_number} · {new Date(x.due_at).toLocaleString('en-IN')}</span><small>{x.note}</small></div>)}</article><article><b>Reopen Requests</b>{v1945ReopenRequests.slice(0,8).map(x=><div key={x.id}><strong>{x.full_name}</strong><span>{x.case_number} · {x.status}</span><small>{x.reason}</small>{x.status==='PENDING'&&<p><button onClick={()=>reviewV1945Reopen(x,'APPROVED')}>Approve</button><button onClick={()=>reviewV1945Reopen(x,'REJECTED')}>Reject</button></p>}</div>)}</article></div>
              {v1945Watchers.case_id&&<div className="v1945-box"><div><b>Collaborators · Case #{v1945Watchers.case_id}</b><button onClick={()=>setV1945Watchers({case_id:null,items:[]})}>Close</button></div><div className="v1945-watchers">{v1945Watchers.items.map(x=><span key={x.id}>{x.watcher_reference}{x.watcher_role?` · ${x.watcher_role}`:''}<button onClick={()=>removeV1945Watcher(x)}>×</button></span>)}</div><div className="v1945-watcher-form"><input value={v1945WatcherForm.watcher_reference} onChange={e=>setV1945WatcherForm(v=>({...v,watcher_reference:e.target.value}))} placeholder="Name / team / reference"/><input value={v1945WatcherForm.watcher_role} onChange={e=>setV1945WatcherForm(v=>({...v,watcher_role:e.target.value}))} placeholder="Role e.g. Finance"/><button onClick={addV1945Watcher}>Add</button></div></div>}
              {v1945Approval&&<div className="v1945-box"><div><b>Closure Approval · Case #{v1945Approval.case_id}</b><button onClick={()=>setV1945Approval(null)}>Close</button></div><div className="v1945-approval"><span>Required: <b>{v1945Approval.required?'YES':'NO'}</b></span><span>Reason: <b>{v1945Approval.reason}</b></span><span>Status: <b>{v1945Approval.approval_status}</b></span><span>Finance linked: <b>{v1945Approval.finance_linked?'YES':'NO'}</b></span></div>{v1945Approval.required&&<div><button onClick={()=>decideV1945Approval('APPROVED')}>Approve Closure</button><button onClick={()=>decideV1945Approval('REJECTED')}>Reject</button></div>}</div>}
            </section>

            <section className="panel v1949-governance">
              <div className="v1949-head"><div><span className="eyebrow">V19.46–V19.49 · RESOLUTION INTELLIGENCE</span><h3>Risk attention, reusable resolution knowledge, governed ownership handoff & teacher confirmation.</h3></div><button onClick={loadV1949Governance}>↻ Refresh</button></div>
              <div className="v1949-kpis"><article><small>Critical Risk</small><b>{v1949Risk.summary?.critical||0}</b></article><article><small>High Risk</small><b>{v1949Risk.summary?.high||0}</b></article><article><small>Medium Risk</small><b>{v1949Risk.summary?.medium||0}</b></article><article><small>Knowledge Patterns</small><b>{v1949Knowledge.length}</b></article></div>
              <div className="v1949-grid"><article><b>Attention Queue</b>{(v1949Risk.cases||[]).slice(0,8).map(x=><div key={x.id}><strong>{x.risk_score} · {x.risk_level}</strong><span>{x.full_name} · {x.case_number}</span><small>{(x.risk_reasons||[]).join(' · ')||'—'}</small></div>)}</article><article><b>Resolution Knowledge</b>{v1949Knowledge.slice(0,8).map(k=><div key={k.id}><strong>{k.title}</strong><span>{k.category} · used {k.usage_count||0}×</span><small>{k.resolution_pattern}</small><span>{k.approval_status||'DRAFT'} · v{k.version||1}</span><p><button onClick={()=>governV1957Knowledge(k,'APPROVED')}>Approve</button><button onClick={()=>governV1957Knowledge(k,'REJECTED')}>Reject</button></p></div>)}</article></div>
              <div className="v1949-knowledge-form"><input value={v1949KnowledgeForm.title} onChange={e=>setV1949KnowledgeForm(v=>({...v,title:e.target.value}))} placeholder="Pattern title"/><input value={v1949KnowledgeForm.category} onChange={e=>setV1949KnowledgeForm(v=>({...v,category:e.target.value}))} placeholder="Category"/><input value={v1949KnowledgeForm.root_cause} onChange={e=>setV1949KnowledgeForm(v=>({...v,root_cause:e.target.value}))} placeholder="Root cause"/><textarea value={v1949KnowledgeForm.resolution_pattern} onChange={e=>setV1949KnowledgeForm(v=>({...v,resolution_pattern:e.target.value}))} placeholder="Reusable resolution pattern"/><button onClick={saveV1949Knowledge}>Save Pattern</button></div>
              {v1949Handoff.case_id&&<div className="v1949-box"><div><b>Ownership Handoff · Case #{v1949Handoff.case_id}</b><button onClick={()=>setV1949Handoff({case_id:null,to_owner:'',reason:'',history:[]})}>Close</button></div><div className="v1949-history">{v1949Handoff.history.map(x=><article key={x.id}><b>{x.from_owner||'Unassigned'} → {x.to_owner}</b><span>{x.reason}</span><small>{new Date(x.created_at).toLocaleString('en-IN')} · {x.acceptance_status||'PENDING'}</small>{(x.acceptance_status||'PENDING')==='PENDING'&&<div><button onClick={()=>decideV1953Handoff(x,'ACCEPTED')}>Accept</button><button onClick={()=>decideV1953Handoff(x,'REJECTED')}>Reject</button></div>}</article>)}</div><div className="v1949-handoff-form"><input value={v1949Handoff.to_owner} onChange={e=>setV1949Handoff(v=>({...v,to_owner:e.target.value}))} placeholder="New owner"/><textarea value={v1949Handoff.reason} onChange={e=>setV1949Handoff(v=>({...v,reason:e.target.value}))} placeholder="Handoff reason"/><button onClick={submitV1949Handoff}>Handoff</button></div></div>}
            </section>

            <section className="panel v1953-intelligence">
              <div className="v1953-head"><div><span className="eyebrow">V19.50–V19.53 · GOVERNED RESOLUTION INTELLIGENCE</span><h3>Risk actions, smart knowledge recommendations, handoff acceptance & resolution acceptance analytics.</h3></div><button onClick={()=>{loadV1949Governance();loadV1953Acceptance();}}>↻ Refresh</button></div>
              <div className="v1953-kpis"><article><small>Resolution Responses</small><b>{v1953Acceptance.summary?.total||0}</b></article><article><small>Accepted</small><b>{v1953Acceptance.summary?.accepted||0}</b></article><article><small>Not Accepted</small><b>{v1953Acceptance.summary?.not_accepted||0}</b></article><article><small>Acceptance Rate</small><b>{v1953Acceptance.summary?.acceptance_rate||0}%</b></article></div>
              {!!v1953Acceptance.categories?.length&&<div className="v1953-categories">{v1953Acceptance.categories.slice(0,8).map(x=><article key={x.category}><b>{x.category}</b><span>Accepted {x.accepted}</span><small>Not accepted {x.not_accepted}</small></article>)}</div>}
              {v1953Recommendations.case_id&&<div className="v1953-box"><div><b>Recommended Resolution Patterns · Case #{v1953Recommendations.case_id}</b><button onClick={()=>setV1953Recommendations({case_id:null,items:[]})}>Close</button></div><div className="v1953-recommendations">{v1953Recommendations.items.map(k=><article key={k.id}><b>{k.title}</b><span>{k.category} · Match {Number(k.match_score||0)}%</span><small>{k.resolution_pattern}</small><button onClick={()=>applyV1949Knowledge(k,{id:v1953Recommendations.case_id})}>Apply Pattern</button></article>)}</div></div>}
            </section>

            <section className="panel v1957-quality">
              <div className="v1957-head"><div><span className="eyebrow">V19.54–V19.57 · RESOLUTION QUALITY CONTROL</span><h3>Effectiveness scoring, governed knowledge, dependency blockers & teacher transparency.</h3></div><button onClick={()=>{loadV1957Effectiveness();loadV1949Governance();}}>↻ Refresh</button></div>
              <div className="v1957-kpis"><article><small>Measured Cases</small><b>{v1957Effectiveness.summary?.total||0}</b></article><article><small>Average Score</small><b>{v1957Effectiveness.summary?.average_score||0}</b></article><article><small>Poor</small><b>{v1957Effectiveness.summary?.poor||0}</b></article><article><small>Mixed</small><b>{v1957Effectiveness.summary?.mixed||0}</b></article></div>
              <div className="v1957-cases">{(v1957Effectiveness.cases||[]).slice(0,8).map(x=><article key={x.id}><b>{x.resolution_effectiveness_score} · {x.resolution_effectiveness_level}</b><span>{x.full_name} · {x.case_number}</span><small>{x.category} · {x.teacher_resolution_confirmation||'No teacher response'}</small></article>)}</div>
              {v1957Blockers.case_id&&<div className="v1957-box"><div><b>Case Blockers · #{v1957Blockers.case_id}</b><button onClick={()=>setV1957Blockers({case_id:null,items:[]})}>Close</button></div><div>{v1957Blockers.items.map(x=><article key={x.id}><b>{x.title}</b><span>{x.blocker_type} · {x.owner_reference||'Unassigned'} · {x.status}</span><small>{x.due_at?new Date(x.due_at).toLocaleString('en-IN'):'No due date'}</small>{x.status==='OPEN'&&<button onClick={()=>resolveV1957Blocker(x)}>Resolve</button>}</article>)}</div><div className="v1957-form"><input value={v1957BlockerForm.title} onChange={e=>setV1957BlockerForm(v=>({...v,title:e.target.value}))} placeholder="Blocker / dependency"/><input value={v1957BlockerForm.owner_reference} onChange={e=>setV1957BlockerForm(v=>({...v,owner_reference:e.target.value}))} placeholder="Dependency owner"/><input type="datetime-local" value={v1957BlockerForm.due_at} onChange={e=>setV1957BlockerForm(v=>({...v,due_at:e.target.value}))}/><button onClick={addV1957Blocker}>Add Blocker</button></div></div>}
            </section>

            <section className="panel v1961-prevention">
              <div className="v1961-head"><div><span className="eyebrow">V19.58–V19.61 · PREVENTION INTELLIGENCE</span><h3>Root-cause learning, preventive action and recurrence monitoring.</h3></div><button onClick={loadV1961Prevention}>↻ Refresh</button></div>
              <div className="v1961-kpis"><article><small>Root Causes</small><b>{v1961RootCause.summary?.root_causes||0}</b></article><article><small>Unclassified</small><b>{v1961RootCause.summary?.unclassified||0}</b></article><article><small>Open CAPA</small><b>{v1961Capa.summary?.open||0}</b></article><article><small>Rising Recurrence</small><b>{v1961Recurrence.summary?.rising||0}</b></article></div>
              <div className="v1961-grid"><article><b>Root Cause Intelligence</b>{(v1961RootCause.roots||[]).slice(0,8).map(x=><div key={`${x.root_cause_code}-${x.root_cause}`}><strong>{x.root_cause}</strong><span>{x.root_cause_code} · {x.total_cases} cases</span><small>Active {x.active_cases} · Not accepted {x.not_accepted} · Effectiveness {x.avg_effectiveness||'—'}</small></div>)}</article><article><b>Recurrence · 30 days</b>{(v1961Recurrence.recurrence||[]).slice(0,8).map(x=><div key={x.id}><strong>{x.root_cause_code}</strong><span>{x.case_count} vs {x.previous_case_count} · {x.trend}</span><small>Change {x.recurrence_rate}%</small></div>)}</article></div>
              <div className="v1961-capa"><b>Preventive Actions / CAPA</b>{(v1961Capa.actions||[]).slice(0,10).map(x=><article key={x.id}><div><strong>{x.title}</strong><span>{x.root_cause_code} · {x.status} · {x.owner_reference||'Unassigned'}</span><small>{x.action_text}</small></div><p>{x.status==='OPEN'&&<button onClick={()=>updateV1961Capa(x,'IN_PROGRESS')}>Start</button>}{['OPEN','IN_PROGRESS'].includes(x.status)&&<button onClick={()=>updateV1961Capa(x,'COMPLETED')}>Complete</button>}{x.status==='COMPLETED'&&<button onClick={()=>verifyV1965Capa(x)}>Verify</button>}</p></article>)}</div>
              <div className="v1961-form"><input value={v1961CapaForm.root_cause_code} onChange={e=>setV1961CapaForm(v=>({...v,root_cause_code:e.target.value}))} placeholder="Root cause code"/><input value={v1961CapaForm.title} onChange={e=>setV1961CapaForm(v=>({...v,title:e.target.value}))} placeholder="Preventive action title"/><input value={v1961CapaForm.owner_reference} onChange={e=>setV1961CapaForm(v=>({...v,owner_reference:e.target.value}))} placeholder="Owner"/><input type="datetime-local" value={v1961CapaForm.due_at} onChange={e=>setV1961CapaForm(v=>({...v,due_at:e.target.value}))}/><textarea value={v1961CapaForm.action_text} onChange={e=>setV1961CapaForm(v=>({...v,action_text:e.target.value}))} placeholder="What must change so this does not repeat?"/><button onClick={createV1961Capa}>Create CAPA</button></div>
            </section>

            <section className="panel v1965-control">
              <div className="v1965-head"><div><span className="eyebrow">V19.62–V19.65 · PREVENTION CONTROL LOOP</span><h3>Verify preventive action, detect recurrence and govern reusable prevention playbooks.</h3></div><button onClick={()=>{loadV1965PreventionControl();scanV1965Alerts();}}>Scan Recurrence</button></div>
              <div className="v1965-grid"><article><b>Recurrence Alerts</b>{v1965Alerts.slice(0,8).map(x=><div key={x.id}><strong>{x.alert_level} · {x.root_cause_code}</strong><span>{x.current_count} vs {x.previous_count} · {x.recurrence_rate}%</span><small>{x.status}</small><p>{x.status==='OPEN'&&<button onClick={()=>updateV1965Alert(x,'ACKNOWLEDGED')}>Acknowledge</button>}{x.status!=='CLOSED'&&<button onClick={()=>updateV1965Alert(x,'CLOSED')}>Close</button>}</p></div>)}</article><article><b>Prevention Playbooks</b>{v1965Playbooks.slice(0,8).map(x=><div key={x.id}><strong>{x.title}</strong><span>{x.root_cause_code} · {x.status} · v{x.version}</span><small>{x.prevention_steps}</small><p>{x.status==='DRAFT'&&<button onClick={()=>governV1965Playbook(x,'APPROVED')}>Approve</button>}{x.status==='APPROVED'&&<button onClick={()=>governV1965Playbook(x,'RETIRED')}>Retire</button>}{x.status==='APPROVED'&&<button onClick={()=>applyV1975Playbook(x)}>Apply</button>}</p></div>)}</article></div>
              <div className="v1965-form"><input value={v1965PlaybookForm.root_cause_code} onChange={e=>setV1965PlaybookForm(v=>({...v,root_cause_code:e.target.value}))} placeholder="Root cause code"/><input value={v1965PlaybookForm.title} onChange={e=>setV1965PlaybookForm(v=>({...v,title:e.target.value}))} placeholder="Playbook title"/><textarea value={v1965PlaybookForm.prevention_steps} onChange={e=>setV1965PlaybookForm(v=>({...v,prevention_steps:e.target.value}))} placeholder="Prevention steps"/><textarea value={v1965PlaybookForm.verification_steps} onChange={e=>setV1965PlaybookForm(v=>({...v,verification_steps:e.target.value}))} placeholder="Verification steps"/><button onClick={createV1965Playbook}>Create Playbook</button></div>
            </section>

            <section className="panel v1975-completion">
              <div className="v1975-head"><div><span className="eyebrow">V19.66–V19.75 · LEARN & EARN COMPLETION GOVERNANCE</span><h3>Operational quality, recurrence prevention, archive integrity and final readiness.</h3></div><div><button onClick={loadV1975Completion}>Refresh</button><button onClick={runV1975CapaSla}>Run CAPA SLA</button><button onClick={runV1975RepeatScan}>Repeat Scan</button><button onClick={runV1975Health}>Health Check</button><button onClick={runV1975Readiness}>Readiness Audit</button></div></div>
              <div className="v1975-kpis">
                <article><small>Active Cases</small><b>{v1975Command.summary?.active||0}</b></article>
                <article><small>Critical</small><b>{v1975Command.summary?.critical||0}</b></article>
                <article><small>Overdue</small><b>{v1975Command.summary?.overdue||0}</b></article>
                <article><small>Recurrence Alerts</small><b>{v1975Command.summary?.alerts||0}</b></article>
                <article><small>CAPA Overdue</small><b>{v1975Command.summary?.capa_overdue||0}</b></article>
                <article><small>Pending Handoffs</small><b>{v1975Command.summary?.pending_handoffs||0}</b></article>
              </div>
              <div className="v1975-grid">
                <article><b>Prevention Effectiveness</b>{(v1975Effectiveness.rows||[]).slice(0,8).map(x=><div key={x.root_cause_code}><strong>{x.root_cause_code}</strong><span>{x.effective}/{x.total} effective · avg {x.avg_score||'—'}</span><small>Partial {x.partial} · Ineffective {x.ineffective}</small></div>)}</article>
                <article><b>Repeat Case Watch</b>{v1975RepeatCases.slice(0,8).map(x=><div key={x.id}><strong>{x.full_name} · {x.case_number}</strong><span>Similarity {x.repeat_case_score}% · Previous #{x.repeat_case_reference_id}</span><small>{x.category||'GENERAL'} · {x.root_cause_code||'Unclassified'}</small></div>)}</article>
                <article><b>Teacher Case Experience</b>{(v1975Experience.cases||[]).slice(0,8).map(x=><div key={x.id}><strong>{x.experience_score} · {x.experience_level}</strong><span>{x.full_name} · {x.case_number}</span><small>{x.category||'GENERAL'}</small></div>)}</article>
                <article><b>Weekly Operations</b><div><strong>New {v1975Weekly.summary?.new_cases||0} · Resolved {v1975Weekly.summary?.resolved_cases||0}</strong><span>Active {v1975Weekly.summary?.active_cases||0} · Overdue {v1975Weekly.summary?.overdue_cases||0}</span><small>Critical {v1975Weekly.summary?.critical_cases||0} · CAPA overdue {v1975Weekly.summary?.overdue_capa||0}</small></div></article>
              </div>
              <div className="v1975-audit">
                <article><b>Governance Health</b>{v1975Health?<><strong>{v1975Health.integrity_score}/100</strong><span>{v1975Health.issue_count} issue(s) · {v1975Health.run_reference}</span></>:<small>Run Health Check to validate case governance integrity.</small>}</article>
                <article><b>Learn & Earn Readiness</b>{v1975Readiness?<><strong>{v1975Readiness.readiness_score}/100 · {v1975Readiness.status}</strong><span>{v1975Readiness.audit_reference}</span><small>{(v1975Readiness.checks||[]).filter(x=>x.status==='FAIL').length} failed check(s)</small></>:<small>Run Readiness Audit for the current completion checkpoint.</small>}</article>
              </div>
            </section>

            <section className="panel v1985-gate">
              <div className="v1985-head"><div><span className="eyebrow">V19.76–V19.85 · 90% COMPLETION GATE</span><h3>Readiness gaps, launch blockers, trust, integrity and executive completion checkpoint.</h3></div><div><button onClick={loadV1985GateData}>Refresh</button><button onClick={addV1985Gap}>+ Gap</button><button onClick={addV1985Blocker}>+ Blocker</button><button onClick={runV1985Gate}>Run 90% Gate</button></div></div>
              <div className="v1985-kpis"><article><small>Open Gaps</small><b>{v1985Gaps.filter(x=>['OPEN','IN_PROGRESS'].includes(x.status)).length}</b></article><article><small>Launch Blockers</small><b>{v1985Blockers.filter(x=>['OPEN','MITIGATING'].includes(x.status)).length}</b></article><article><small>Teacher Trust</small><b>{v1985Scorecard.teacher_trust_avg||0}</b></article><article><small>Open Cases</small><b>{v1985Scorecard.open_cases||0}</b></article><article><small>Learner Checks</small><b>{v1985Scorecard.learner_integrity_pass||0}</b></article><article><small>Teachers</small><b>{v1985Scorecard.teachers_total||0}</b></article></div>
              <div className="v1985-grid"><article><b>Teacher Trust Index</b>{(v1985Trust.teachers||[]).slice(0,8).map(x=><div key={x.teacher_profile_id}><strong>{x.full_name} · {x.trust_score}</strong><span>{x.trust_level} · {x.howdi_id||''}</span><small>Accepted {x.accepted||0} · Not accepted {x.not_accepted||0}</small></div>)}</article><article><b>Earnings Integrity</b><div><strong>Earnings {v1985Integrity.teacher_earnings?.total||0}</strong><span>Settled {v1985Integrity.teacher_earnings?.settled||0} · Eligible {v1985Integrity.teacher_earnings?.eligible||0}</span><small>Hold {v1985Integrity.teacher_earnings?.hold||0} · Settlement failures {v1985Integrity.settlements?.failed||0}</small></div></article><article><b>Learner Outcome Integrity</b>{v1985LearnerIntegrity.map(x=><div key={x.key}><strong>{x.key}</strong><span>{x.status} · {x.count??'—'}</span><small>{x.detail||''}</small></div>)}</article><article><b>Launch Readiness</b>{v1985Blockers.slice(0,8).map(x=><div key={x.id}><strong>{x.title}</strong><span>{x.severity} · {x.status}</span><small>{x.area}</small></div>)}</article></div>
              <div className="v1985-result">{v1985Gate?<><b>{v1985Gate.completion_score}/100 · {v1985Gate.gate_status}</b><span>{v1985Gate.run_reference}</span><small>{(v1985Gate.checks||[]).filter(x=>x.status==='FAIL').length} fail · {(v1985Gate.checks||[]).filter(x=>x.status==='WARN').length} warning</small></>:<><b>90% completion checkpoint</b><small>Run the gate after backend/database restart.</small></>}</div>
            </section>

            <section className="panel v1995-recap">
              <div className="v1995-head"><div><span className="eyebrow">V19.86–V19.95 · RECAP READINESS & FREEZE</span><h3>Resolve the final gaps, capture risk, build the recap pack and freeze the 90% Learn & Earn baseline.</h3></div><div><button onClick={loadV1995RecapControl}>Refresh</button><button onClick={snapshotV1995Trust}>Trust Snapshot</button><button onClick={buildV1995Recap}>Build Recap Pack</button><button onClick={freezeV1995}>Freeze 90%</button></div></div>
              <div className="v1995-kpis"><article><small>Gate Runs</small><b>{v1995History.length}</b></article><article><small>Pending Dual Control</small><b>{v1995DualQueue.length}</b></article><article><small>Risk Areas</small><b>{v1995Heatmap.filter(x=>x.count>0).length}</b></article><article><small>Trust Snapshots</small><b>{v1995Trends.length}</b></article><article><small>Recap Pack</small><b>{v1995Recap?'READY':'—'}</b></article><article><small>Freeze</small><b>{v1995Freeze?'FROZEN':'OPEN'}</b></article></div>
              <div className="v1995-grid">
                <article><b>Risk Heatmap</b>{v1995Heatmap.map((x,i)=><div key={`${x.area}-${i}`}><strong>{x.area}</strong><span>{x.risk} · {x.count}</span><small>{x.detail}</small></div>)}</article>
                <article><b>Completion Gate History</b>{v1995History.slice(0,8).map(x=><div key={x.id}><strong>{x.completion_score}/100 · {x.gate_status}</strong><span>{x.run_reference}</span><small>{new Date(x.created_at).toLocaleString('en-IN')}</small></div>)}</article>
                <article><b>Final Readiness Gaps</b>{v1985Gaps.filter(x=>['OPEN','IN_PROGRESS'].includes(x.status)).slice(0,8).map(x=><div key={x.id}><strong>{x.title}</strong><span>{x.severity} · {x.status}</span><p><button onClick={()=>updateV1995Gap(x,'IN_PROGRESS')}>Work</button><button onClick={()=>updateV1995Gap(x,'RESOLVED')}>Resolve</button></p></div>)}</article>
                <article><b>Final Launch Blockers</b>{v1985Blockers.filter(x=>['OPEN','MITIGATING'].includes(x.status)).slice(0,8).map(x=><div key={x.id}><strong>{x.title}</strong><span>{x.severity} · {x.status}</span><p><button onClick={()=>updateV1995Blocker(x,'MITIGATING')}>Mitigate</button><button onClick={()=>updateV1995Blocker(x,'CLEARED')}>Clear</button></p></div>)}</article>
              </div>
              <div className="v1995-pack">{v1995Recap?<><b>{v1995Recap.pack_reference} · {v1995Recap.completion_score}/100</b><span>{v1995Recap.gate_status}</span><small>{(v1995Recap.open_items||[]).length} remaining open item(s)</small></>:<><b>No recap pack yet</b><small>Build after the latest completion gate.</small></>}{v1995Freeze&&<em>Frozen baseline: {v1995Freeze.freeze_reference} · {v1995Freeze.version_label}</em>}</div>
            </section>

            <section className="panel v2005-final">
              <div className="v2005-head"><div><span className="eyebrow">V19.96–V20.05 · FINAL LEARN & EARN COMPLETION</span><h3>Freeze history, final open items, data integrity, QA, readiness decision and completion seal.</h3></div><div><button onClick={loadV2005Finalization}>Refresh</button><button onClick={addV2005OpenItem}>+ Open Item</button><button onClick={decideV2005Readiness}>Decide Readiness</button><button onClick={sealV2005}>Create Completion Seal</button></div></div>
              <div className="v2005-kpis"><article><small>Final Score</small><b>{v2005Scorecard.completion_score||0}</b></article><article><small>Open Items</small><b>{v2005Scorecard.final_open_items||0}</b></article><article><small>Gaps</small><b>{v2005Scorecard.readiness_gaps||0}</b></article><article><small>Blockers</small><b>{v2005Scorecard.launch_blockers||0}</b></article><article><small>Freeze History</small><b>{v2005Freezes.length}</b></article><article><small>Recap Packs</small><b>{v2005Packs.length}</b></article></div>
              <div className="v2005-grid">
                <article><b>Data Integrity</b>{v2005Integrity.map(x=><div key={x.key}><strong>{x.key}</strong><span>{x.status} · {x.count??'—'}</span><small>{x.detail||''}</small></div>)}</article>
                <article><b>Capability Inventory</b>{v2005Capabilities.map(x=><div key={x.area}><strong>{x.area}</strong><span>{x.capability}</span></div>)}</article>
                <article><b>Final Open Items</b>{v2005OpenItems.filter(x=>x.status!=='CLOSED').slice(0,10).map(x=><div key={x.id}><strong>{x.title}</strong><span>{x.area} · {x.severity}</span><button onClick={()=>closeV2005OpenItem(x)}>Close</button></div>)}</article>
                <article><b>Manual QA</b>{v2005Qa.map(x=><div key={x.id}><strong>{x.title}</strong><span>{x.area} · {x.status}</span><p><button onClick={()=>updateV2005Qa(x,'PASSED')}>Pass</button><button onClick={()=>updateV2005Qa(x,'FAILED')}>Fail</button></p></div>)}</article>
              </div>
              <div className="v2005-status">
                <article><b>Production Readiness</b>{v2005Readiness?<><strong>{v2005Readiness.score}/100 · {v2005Readiness.decision}</strong><small>{(v2005Readiness.blockers||[]).length} blocker(s)</small></>:<small>Not decided yet.</small>}</article>
                <article><b>Completion Seal</b>{v2005Seal?<><strong>{v2005Seal.seal_reference}</strong><span>{v2005Seal.version_label} · {v2005Seal.completion_score}/100</span><small>{v2005Seal.production_decision}</small></>:<small>Seal after readiness is approved.</small>}</article>
              </div>
            </section>

            <div className="le-admin-section-banner le-admin-comp-banner">
              <div><span className="eyebrow">TEACHER PAY</span><h3>Compensation & Delivery</h3><p>Set the agreement, validate completed teaching, then create governed earnings.</p></div>
            </div>
            <section id="teacher-compensation-center" className="panel v2010-comp-center">
              <div className="v2010-comp-head">
                <div><span className="eyebrow">V20.10 · TEACHER COMPENSATION CONTROL CENTER</span><h3>Set the teacher earning model before delivery starts.</h3><p>Hourly, per class/session, full-course, per-learner or hybrid. Teachers must accept the offered agreement before calculation.</p></div>
                <button onClick={loadV2006Compensation}>↻ Refresh</button>
              </div>
              <div className="v2010-comp-grid">
                <div className="v2010-comp-form">
                  <label>Teacher<select value={v2010CompForm.teacher_profile_id} onChange={e=>setV2010CompForm({...v2010CompForm,teacher_profile_id:e.target.value})}><option value="">Select approved teacher</option>{v2010Teachers.filter(x=>x.application_status==='APPROVED').map(x=><option key={x.id} value={x.id}>{x.full_name} · {x.howdi_id||x.teacher_code||x.id}</option>)}</select></label>
                  <label>Pay model<select value={v2010CompForm.model} onChange={e=>setV2010CompForm({...v2010CompForm,model:e.target.value})}><option>HOURLY</option><option>PER_SESSION</option><option>FULL_COURSE</option><option>PER_LEARNER</option><option>HYBRID</option></select></label>
                  {(v2010CompForm.model==='HOURLY'||v2010CompForm.model==='HYBRID')&&<label>₹ per hour<input type="number" min="0" value={v2010CompForm.hourly_rate} onChange={e=>setV2010CompForm({...v2010CompForm,hourly_rate:e.target.value})}/></label>}
                  {(v2010CompForm.model==='PER_SESSION'||v2010CompForm.model==='HYBRID')&&<label>₹ per class/session<input type="number" min="0" value={v2010CompForm.session_rate} onChange={e=>setV2010CompForm({...v2010CompForm,session_rate:e.target.value})}/></label>}
                  {v2010CompForm.model==='FULL_COURSE'&&<label>Full-course payout ₹<input type="number" min="0" value={v2010CompForm.course_amount} onChange={e=>setV2010CompForm({...v2010CompForm,course_amount:e.target.value})}/></label>}
                  {(v2010CompForm.model==='PER_LEARNER'||v2010CompForm.model==='HYBRID')&&<label>₹ per eligible learner<input type="number" min="0" value={v2010CompForm.learner_rate} onChange={e=>setV2010CompForm({...v2010CompForm,learner_rate:e.target.value})}/></label>}
                  {v2010CompForm.model==='HYBRID'&&<label>Fixed component ₹<input type="number" min="0" value={v2010CompForm.fixed_amount} onChange={e=>setV2010CompForm({...v2010CompForm,fixed_amount:e.target.value})}/></label>}
                  <label>Course ID (optional)<input value={v2010CompForm.course_id} onChange={e=>setV2010CompForm({...v2010CompForm,course_id:e.target.value})}/></label>
                  <label>Batch ID (optional)<input value={v2010CompForm.batch_id} onChange={e=>setV2010CompForm({...v2010CompForm,batch_id:e.target.value})}/></label>
                  <label className="wide">Agreement note<textarea rows="3" value={v2010CompForm.terms_note} onChange={e=>setV2010CompForm({...v2010CompForm,terms_note:e.target.value})} placeholder="Payment conditions, milestones, exclusions, cancellation rules…"/></label>
                  <button className="v2010-offer-btn" onClick={createV2006Agreement} disabled={v2010CompBusy}>{v2010CompBusy?'Creating…':'Offer Compensation Agreement'}</button>
                </div>
                <div className="v2010-comp-guide">
                  <article><b>Hourly</b><span>Validated teaching minutes ÷ 60 × hourly rate.</span></article>
                  <article><b>Per Class</b><span>Validated completed sessions × session rate.</span></article>
                  <article><b>Full Course</b><span>Fixed course amount released against verified course completion.</span></article>
                  <article><b>Per Learner</b><span>Eligible verified learners × learner rate.</span></article>
                  <article><b>Hybrid</b><span>Fixed + hourly + session + learner components.</span></article>
                </div>
              </div>

              <div className="v2017-calc-center">
                <div className="v2017-calc-title">
                  <div><b>Compensation Calculation & Earning Handoff</b><span>Select the completed class below. HOWDI automatically carries the teacher, delivery ID and available attendance metrics into the compensation calculation.</span></div>
                  <span className="v2017-safe">No automatic payout</span>
                </div>

                <div className="v2018-delivery-picker">
                  <div className="v2018-picker-head">
                    <div><b>1 · Select Completed Delivery</b><span>{(teacherDeliveryControl.direct||[]).length} direct · {(teacherDeliveryControl.groups||[]).length} group awaiting earning review</span></div>
                    <button onClick={loadV2006Compensation}>↻ Refresh</button>
                  </div>
                  <div className="v2018-delivery-columns">
                    <section>
                      <h4>DIRECT / 1:1</h4>
                      <div className="v2018-delivery-list">
                        {(teacherDeliveryControl.direct||[]).slice(0,20).map(x=>{
                          const agreement=v2006Comp.find(y=>String(y.teacher_profile_id)===String(x.teacher_profile_id)&&y.status==='ACTIVE'&&y.teacher_acceptance==='ACCEPTED');
                          return <article key={x.source_id}>
                            <div><b>{x.teacher_name||'HOWDI Teacher'}</b><span>{x.teacher_howdi_id||'—'}</span></div>
                            <strong>{x.booking_code||'Completed direct class'}</strong>
                            <small>{x.course_title||'General learning'} · {x.session_type||'DIRECT'} · {x.attended_minutes||0} min</small>
                            <div className="v2018-delivery-footer"><span className={agreement?'matched':'missing'}>{agreement?`${agreement.model} agreement`:'Agreement required'}</span><button onClick={()=>selectV2018CompDelivery(x)}>Select</button></div>
                          </article>
                        })}
                        {!(teacherDeliveryControl.direct||[]).length&&<div className="v2010-empty">No completed direct deliveries awaiting review.</div>}
                      </div>
                    </section>
                    <section>
                      <h4>GROUP / BATCH</h4>
                      <div className="v2018-delivery-list">
                        {(teacherDeliveryControl.groups||[]).slice(0,20).map(x=>{
                          const agreement=v2006Comp.find(y=>String(y.teacher_profile_id)===String(x.teacher_profile_id)&&y.status==='ACTIVE'&&y.teacher_acceptance==='ACCEPTED');
                          return <article key={x.source_id}>
                            <div><b>{x.teacher_name||'HOWDI Teacher'}</b><span>{x.teacher_howdi_id||'—'}</span></div>
                            <strong>{x.session_code||x.batch_code||'Completed group class'}</strong>
                            <small>{x.course_title||x.batch_title||'Group learning'} · {x.attended_count||0}/{x.roster_count||0} attended</small>
                            <div className="v2018-delivery-footer"><span className={agreement?'matched':'missing'}>{agreement?`${agreement.model} agreement`:'Agreement required'}</span><button onClick={()=>selectV2018CompDelivery(x)}>Select</button></div>
                          </article>
                        })}
                        {!(teacherDeliveryControl.groups||[]).length&&<div className="v2010-empty">No completed group deliveries awaiting review.</div>}
                      </div>
                    </section>
                  </div>
                </div>

                <div id="v2018-comp-calc-form" className="v2018-calc-step">
                  <div className="v2018-step-title"><b>2 · Review Calculation Inputs</b><span>Attendance values can be corrected by Admin before calculation if the governed delivery record requires adjustment.</span></div>
                  <div className="v2017-calc-form">
                    <label>Accepted agreement<select value={v2017CalcForm.agreement_id} onChange={e=>setV2017CalcForm({...v2017CalcForm,agreement_id:e.target.value})}><option value="">Select agreement</option>{v2006Comp.filter(x=>x.status==='ACTIVE'&&x.teacher_acceptance==='ACCEPTED').map(x=><option key={x.id} value={x.id}>{x.full_name} · {x.model} · {x.agreement_number}</option>)}</select></label>
                    <label>Delivery type<select value={v2017CalcForm.delivery_type} onChange={e=>setV2017CalcForm({...v2017CalcForm,delivery_type:e.target.value})}><option>DIRECT</option><option>GROUP</option></select></label>
                    <label className="v2018-wide">Completed delivery ID<input readOnly value={v2017CalcForm.delivery_reference} placeholder="Select a completed class above"/></label>
                    <label>Validated minutes<input type="number" min="0" value={v2017CalcForm.validated_minutes} onChange={e=>setV2017CalcForm({...v2017CalcForm,validated_minutes:e.target.value})}/></label>
                    <label>Validated classes<input type="number" min="0" value={v2017CalcForm.validated_sessions} onChange={e=>setV2017CalcForm({...v2017CalcForm,validated_sessions:e.target.value})}/></label>
                    <label>Eligible learners<input type="number" min="0" value={v2017CalcForm.eligible_learners} onChange={e=>setV2017CalcForm({...v2017CalcForm,eligible_learners:e.target.value})}/></label>
                    <label>Course completion %<input type="number" min="0" max="100" value={v2017CalcForm.course_completion_percent} onChange={e=>setV2017CalcForm({...v2017CalcForm,course_completion_percent:e.target.value})}/></label>
                    <button onClick={calculateV2017Compensation} disabled={v2017CalcBusy}>{v2017CalcBusy?'Working…':'Calculate Compensation'}</button>
                  </div>
                </div>

                <div className="v2018-calc-step">
                  <div className="v2018-step-title"><b>3 · Validate Governed Earning</b><span>Calculation alone does not create a payable earning. Admin must validate the completed delivery.</span></div>
                  <div className="v2017-calc-list">
                    {v2017CompCalculations.slice(0,20).map(x=><article key={x.id}>
                      <div><b>{x.full_name}</b><span>{x.model} · {x.delivery_type}</span></div>
                      <strong>₹{Number(x.calculated_amount||0).toLocaleString('en-IN')}</strong>
                      <small>{x.delivery_reference}</small>
                      <div className="v2017-calc-metrics"><span>{x.validated_sessions||0} class</span><span>{(Number(x.validated_minutes||0)/60).toFixed(1)} h</span><span>{x.eligible_learners||0} learners</span></div>
                      <div className="v2017-calc-state"><span>{x.earning_status||x.status}</span>{!['VALIDATED','SETTLED','PAID'].includes(String(x.earning_status||'').toUpperCase())&&<button onClick={()=>validateV2017Compensation(x)} disabled={v2017CalcBusy}>Validate & Create Earning</button>}</div>
                    </article>)}
                    {!v2017CompCalculations.length&&<div className="v2010-empty">No compensation calculations yet.</div>}
                  </div>
                </div>
              </div>

              <div className="v2010-agreements">
                {v2006Comp.slice(0,30).map(x=><article key={x.id}>
                  <div><b>{x.full_name}</b><span>{x.agreement_number} · Version {x.version}</span></div>
                  <strong>{x.model}</strong>
                  <small>₹/hour {x.hourly_rate} · ₹/class {x.session_rate} · course ₹{x.course_amount} · ₹/learner {x.learner_rate} · fixed ₹{x.fixed_amount}</small>
                  <div className="v2010-statusline"><span className={`status ${String(x.status).toLowerCase()}`}>{x.status}</span><span>Teacher: {x.teacher_acceptance}</span></div>
                  <div className="v2010-agreement-actions">{x.status!=='RETIRED'&&<button onClick={()=>setV2010CompStatus(x.id,'SUSPENDED')}>Suspend</button>}<button onClick={()=>setV2010CompStatus(x.id,'RETIRED')}>Retire</button></div>
                </article>)}
                {!v2006Comp.length&&<div className="v2010-empty">No teacher compensation agreements yet.</div>}
              </div>
              <div className="v2010-governance-note">🔒 Agreement changes create new versions; historical calculated/settled earnings remain separate.</div>
            </section>

            <section className="panel teacher-statement-cases-v1922">
              <div className="statement-cases-head"><div><span className="eyebrow">V19.22 · STATEMENT DISPUTE CONTROL</span><h3>Teacher statement acknowledgements & finance review cases.</h3><p>Review disputes without automatically changing earnings, settlements or payouts.</p></div><div className="statement-case-head-actions"><button onClick={runTeacherStatementSla} disabled={teacherStatementCaseBusy}>⚡ Run SLA</button><button onClick={loadTeacherStatementCases} disabled={teacherStatementCaseBusy}>↻ Refresh Cases</button></div></div>
              <div className="statement-cases-kpis"><article><small>Open</small><b>{teacherStatementCases.summary?.open||0}</b></article><article><small>Under review</small><b>{teacherStatementCases.summary?.under_review||0}</b></article><article><small>Disputes</small><b>{teacherStatementCases.summary?.disputes||0}</b></article><article><small>Resolved</small><b>{teacherStatementCases.summary?.resolved||0}</b></article><article><small>Overdue</small><b>{teacherStatementCases.summary?.overdue||0}</b></article><article><small>Unassigned</small><b>{teacherStatementCases.summary?.unassigned||0}</b></article><article><small>Escalated</small><b>{teacherStatementCases.summary?.escalated||0}</b></article><article><small>Critical</small><b>{teacherStatementCases.summary?.critical_escalations||0}</b></article></div>
              {teacherCaseTriageDraft.id&&<div className="statement-case-triage-v1925">
                <div><span className="eyebrow">DISPUTE TRIAGE</span><h4>Case #{teacherCaseTriageDraft.id}</h4></div>
                <label>Owner<input value={teacherCaseTriageDraft.assigned_to} onChange={e=>setTeacherCaseTriageDraft(v=>({...v,assigned_to:e.target.value}))} placeholder="Finance / support owner"/></label>
                <label>Priority<select value={teacherCaseTriageDraft.priority} onChange={e=>setTeacherCaseTriageDraft(v=>({...v,priority:e.target.value}))}><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>CRITICAL</option></select></label>
                <label>Due date<input type="datetime-local" value={teacherCaseTriageDraft.due_at} onChange={e=>setTeacherCaseTriageDraft(v=>({...v,due_at:e.target.value}))}/></label>
                <div><button className="secondary" onClick={()=>setTeacherCaseTriageDraft({id:null,assigned_to:'',priority:'NORMAL',due_at:''})}>Cancel</button><button onClick={saveTeacherCaseTriage}>Save SLA</button></div>
              </div>}
              <div className="statement-cases-list">
                {(teacherStatementCases.cases||[]).map(x=><article key={x.id} className={x.is_overdue?'overdue-case':''}>
                  <div><b>{x.full_name}</b><small>{x.howdi_id||'—'} · Statement {x.statement_month}</small></div>
                  <div><b>{x.case_number}</b><small>{x.case_type} · {x.reason||'—'}</small><small>{x.assigned_to?`Owner: ${x.assigned_to}`:'Unassigned'} · {x.priority||'NORMAL'}{x.is_overdue?' · OVERDUE':''}</small></div>
                  <div><span className={`statement-case-status ${String(x.status).toLowerCase().replaceAll('_','-')}`}>{x.status}</span><small>{x.teacher_note||'No teacher note'}</small><small>{x.due_at?`Due ${new Date(x.due_at).toLocaleString('en-IN')}`:'No SLA date'}</small></div>
                  <div className="statement-case-admin-actions">
                    {x.case_type==='DISPUTE'&&['OPEN','UNDER_REVIEW'].includes(x.status)&&<button className="secondary" onClick={()=>editTeacherCaseTriage(x)}>Assign / SLA</button>}<button className="secondary" onClick={()=>openTeacherCaseConversation(x)}>Conversation</button><button className="secondary" onClick={()=>openV1933Taxonomy(x)}>Classify</button><button className="secondary" onClick={()=>openV1937Evidence(x)}>Evidence</button><button className="secondary" onClick={()=>openV1937Closure(x)}>Closure</button><button className="secondary" onClick={()=>exportV1937Audit(x)}>Audit Pack</button><button className="secondary" onClick={()=>openV1941Followups(x)}>Follow-up</button><button className="secondary" onClick={()=>openV1941Impact(x)}>Impact</button><button className="secondary" onClick={()=>exportV1941Summary(x)}>Summary</button><button className="secondary" onClick={()=>openV1945Watchers(x)}>Collaborators</button><button className="secondary" onClick={()=>openV1945Approval(x)}>Approval</button><button className="secondary" onClick={()=>openV1949Handoff(x)}>Handoff</button><button className="secondary" onClick={()=>recommendV1953Knowledge(x)}>Recommend</button><button className="secondary" onClick={()=>actV1953Risk(x,'ACKNOWLEDGED')}>Risk ✓</button><button className="secondary" onClick={()=>openV1957Blockers(x)}>Blockers</button><button className="secondary" onClick={()=>validateV1961RootCause(x)}>Root Cause</button>{x.status==='CLOSED'&&<button className="secondary" onClick={()=>archiveV1975Case(x)}>{x.archive_status==='ARCHIVED'?'Restore':'Archive'}</button>}
                    {x.status==='OPEN'&&<button onClick={()=>updateTeacherStatementCase(x,'UNDER_REVIEW')}>Start Review</button>}
                    {['OPEN','UNDER_REVIEW'].includes(x.status)&&<button onClick={()=>updateTeacherStatementCase(x,'RESOLVED')}>Resolve</button>}
                    {x.status==='RESOLVED'&&<button onClick={()=>updateTeacherStatementCase(x,'CLOSED')}>Close</button>}
                  </div>
                  {Number(x.escalation_level||0)>0&&<div className={`case-escalation-banner level-${x.escalation_level}`}><b>Escalation L{x.escalation_level}</b><span>{x.escalation_reason||'SLA escalation active'}</span></div>}
                  {!!(x.timeline||[]).length&&<details className="case-timeline-v1926"><summary>Audit Timeline · {(x.timeline||[]).length} event(s)</summary><div>{(x.timeline||[]).map(ev=><article key={ev.id}><span>{new Date(ev.created_at).toLocaleString('en-IN')}</span><b>{String(ev.event_type||'').replaceAll('_',' ')}</b><small>{ev.actor_type} · {ev.actor_reference||'—'}</small>{ev.note&&<p>{ev.note}</p>}</article>)}</div></details>}
                </article>)}
                {!teacherStatementCaseBusy&&!(teacherStatementCases.cases||[]).length&&<div className="teacher-statements-empty">No statement acknowledgement or dispute cases yet.</div>}
              </div>
              {teacherCaseConversation.case_id&&<div className="teacher-case-conversation-v1929">
                <div className="case-conversation-head"><div><span className="eyebrow">V19.29 · CASE CONVERSATION</span><h4>Case #{teacherCaseConversation.case_id}</h4></div><button className="secondary" onClick={()=>setTeacherCaseConversation({case_id:null,messages:[]})}>Close</button></div>
                <div className="case-conversation-messages">
                  {(teacherCaseConversation.messages||[]).map(m=><article key={m.id} className={`${String(m.sender_type).toLowerCase()} ${m.is_internal?'internal':''}`}>
                    <div><b>{m.sender_type==='ADMIN'?(m.is_internal?'Admin · Internal note':'HOWDI Finance / Admin'):'Teacher'}</b><small>{new Date(m.created_at).toLocaleString('en-IN')}</small></div>
                    <p>{m.message}</p>
                  </article>)}
                  {!(teacherCaseConversation.messages||[]).length&&<div className="teacher-statements-empty">No conversation messages yet.</div>}
                </div>
                <div className="case-conversation-compose">
                  <textarea value={teacherCaseReply} onChange={e=>setTeacherCaseReply(e.target.value)} placeholder={teacherCaseReplyInternal?'Internal note — hidden from teacher':'Reply to teacher…'}/>
                  <label><input type="checkbox" checked={teacherCaseReplyInternal} onChange={e=>setTeacherCaseReplyInternal(e.target.checked)}/> Internal note</label>
                  <button onClick={sendTeacherCaseReply} disabled={teacherCaseConversationBusy||!teacherCaseReply.trim()}>{teacherCaseReplyInternal?'Add Internal Note':'Send Reply'}</button>
                </div>
              </div>}
              <div className="teacher-statements-policy"><span>🛡️</span><p>Case review is separate from money movement. Admin must use the governed earning, settlement and payout controls for any legitimate financial correction.</p></div>
            </section>

            <section className="panel teacher-statements-v1921">
              <div className="teacher-statements-head">
                <div><span className="eyebrow">V19.21 · TEACHER EARNINGS STATEMENTS</span><h3>Monthly earnings and payout-advice oversight.</h3><p>Finance can review monthly teacher ledger totals without changing balances or payout status.</p></div>
                <div className="teacher-statements-controls">
                  <input type="month" value={teacherStatementMonth} onChange={e=>setTeacherStatementMonth(e.target.value)}/>
                  <button onClick={()=>loadTeacherStatements(teacherStatementMonth)} disabled={teacherStatementsBusy}>{teacherStatementsBusy?'Loading…':'Load Month'}</button>
                </div>
              </div>
              <div className="teacher-statements-kpis">
                <article><small>Teachers with earnings</small><b>{teacherStatements.summary?.teachers_with_earnings||0}</b></article>
                <article><small>Gross</small><b>₹{Number(teacherStatements.summary?.gross_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></article>
                <article><small>Net</small><b>₹{Number(teacherStatements.summary?.net_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></article>
                <article><small>Paid</small><b>₹{Number(teacherStatements.summary?.paid_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></article>
                <article><small>Posted corrections</small><b>₹{Number(teacherStatements.summary?.posted_adjustment_total||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></article>
                <article><small>Adjusted net view</small><b>₹{Number(teacherStatements.summary?.adjusted_net_view||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></article>
              </div>
              <div className="teacher-statements-table">
                <div className="teacher-statements-row head"><span>Teacher</span><span>Readiness</span><span>Earnings</span><span>Hold / Eligible</span><span>Settled / Paid</span><span>Corrections</span></div>
                {(teacherStatements.teachers||[]).filter(x=>Number(x.earning_count||0)>0).map(x=><div className="teacher-statements-row" key={x.teacher_profile_id}>
                  <div><b>{x.full_name}</b><small>{x.howdi_id||'—'} · {x.hpay_account_code||'No HPay account'}</small></div>
                  <div><b>KYC {x.kyc_status}</b><small>Payout {x.payout_status}</small></div>
                  <div><b>{x.earning_count||0} record(s)</b><small>Net ₹{Number(x.net_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</small></div>
                  <div><b>₹{Number(x.hold_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})} hold</b><small>₹{Number(x.eligible_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})} eligible</small></div>
                  <div><b>₹{Number(x.settled_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})} settled</b><small>₹{Number(x.paid_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})} paid</small></div>
                  <div><b>₹{Number(x.posted_adjustment_total||0).toLocaleString('en-IN',{maximumFractionDigits:2})} correction</b><small>Adjusted net ₹{Number(x.adjusted_net_view||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</small></div>
                </div>)}
                {!teacherStatementsBusy&&!(teacherStatements.teachers||[]).some(x=>Number(x.earning_count||0)>0)&&<div className="teacher-statements-empty">No teacher earnings recorded for this month.</div>}
              </div>
              <div className="teacher-statements-policy"><span>📄</span><p>These are HOWDI platform ledger statements, not tax invoices, Form 16/16A, bank statements or proof of transfer.</p></div>
            </section>

            <section className="panel teacher-payout-recon-v1920">
              <div className="teacher-recon-head">
                <div>
                  <span className="eyebrow">V19.20 · TEACHER PAYOUT RECONCILIATION</span>
                  <h3>Finance integrity checks across teaching → earning → settlement → payout.</h3>
                  <p>Read-only reconciliation detects broken traces and amount mismatches. It never changes payment status or creates money.</p>
                </div>
                <button onClick={runTeacherPayoutReconciliation} disabled={teacherPayoutReconBusy}>
                  {teacherPayoutReconBusy?'Running checks…':'Run Reconciliation →'}
                </button>
              </div>

              <div className="teacher-recon-kpis">
                <article><small>Integrity</small><b className={`recon-state ${String(teacherPayoutRecon.latest?.summary?.integrity_status||'NOT_RUN').toLowerCase()}`}>{teacherPayoutRecon.latest?.summary?.integrity_status||'NOT RUN'}</b></article>
                <article><small>Total issues</small><b>{teacherPayoutRecon.latest?.issue_count||0}</b></article>
                <article><small>Critical</small><b>{teacherPayoutRecon.latest?.summary?.critical||0}</b></article>
                <article><small>Warnings</small><b>{teacherPayoutRecon.latest?.summary?.warning||0}</b></article>
              </div>

              {teacherPayoutRecon.latest&&<div className="teacher-recon-meta">
                <span>Run <b>{teacherPayoutRecon.latest.run_number}</b></span>
                <span>{teacherPayoutRecon.latest.summary?.checks_run||8} checks</span>
                <span>{new Date(teacherPayoutRecon.latest.created_at).toLocaleString('en-IN')}</span>
                <span>By {teacherPayoutRecon.latest.created_by}</span>
              </div>}

              <div className="teacher-recon-issues">
                <div className="teacher-recon-subhead"><span>LATEST ISSUES</span><h4>Only discrepancies are shown</h4></div>
                <div className="teacher-recon-table">
                  <div className="teacher-recon-table-head"><span>Severity</span><span>Issue</span><span>Entity</span><span>Expected</span><span>Actual</span></div>
                  {(teacherPayoutRecon.issues||[]).map(x=><div className="teacher-recon-table-row" key={x.id}>
                    <span className={`recon-severity ${String(x.severity).toLowerCase()}`}>{x.severity}</span>
                    <div><b>{String(x.issue_type||'').replaceAll('_',' ')}</b><small>{x.detail?.batch_number||x.detail?.settlement_number||x.detail?.hpay_earning_id||'Trace integrity check'}</small></div>
                    <div><b>{x.entity_type}</b><small>#{x.entity_reference}</small></div>
                    <span>{x.expected_amount!=null?`₹${Number(x.expected_amount).toLocaleString('en-IN',{maximumFractionDigits:2})}`:'—'}</span>
                    <span>{x.actual_amount!=null?`₹${Number(x.actual_amount).toLocaleString('en-IN',{maximumFractionDigits:2})}`:'—'}</span>
                  </div>)}
                  {teacherPayoutRecon.latest&&!(teacherPayoutRecon.issues||[]).length&&<div className="teacher-recon-clean">✓ No teacher payout integrity issues found in the latest run.</div>}
                  {!teacherPayoutRecon.latest&&<div className="teacher-recon-empty">Run the first reconciliation to establish the teacher payout integrity baseline.</div>}
                </div>
              </div>

              <div className="teacher-recon-history">
                <div className="teacher-recon-subhead"><span>RECENT RUNS</span><h4>Immutable reconciliation history</h4></div>
                <div className="teacher-recon-history-list">
                  {(teacherPayoutRecon.history||[]).slice(0,10).map(x=><article key={x.id}>
                    <div><b>{x.run_number}</b><small>{new Date(x.created_at).toLocaleString('en-IN')}</small></div>
                    <span className={`recon-state ${String(x.summary?.integrity_status||x.status).toLowerCase()}`}>{x.summary?.integrity_status||x.status}</span>
                    <strong>{x.issue_count} issue(s)</strong>
                  </article>)}
                </div>
              </div>

              <div className="teacher-recon-policy">
                <span>🧾</span>
                <div><b>Reconciliation is diagnostic, not corrective.</b><p>V19.20 records discrepancies for finance review but does not automatically repair amounts, mark payouts paid, create earnings, or contact a bank/payment provider.</p></div>
              </div>
            </section>

            <section className="panel teacher-payout-control-v1919">
              <div className="teacher-payout-head">
                <div>
                  <span className="eyebrow">V19.19 · TEACHER PAYOUT BATCH CONTROL</span>
                  <h3>Finance-controlled payout batches for Learn & Earn teachers.</h3>
                  <p>Select eligible settlements → create DRAFT batch → approve → record external UTR/reference → mark PAID.</p>
                </div>
                <button className="secondary" onClick={loadTeacherPayoutControl} disabled={teacherPayoutBusy}>
                  {teacherPayoutBusy?'Refreshing…':'↻ Refresh payout control'}
                </button>
              </div>

              <div className="teacher-payout-kpis">
                <article><small>Eligible settlements</small><b>{teacherPayoutControl.summary?.eligible_settlements||0}</b></article>
                <article><small>Eligible amount</small><b>₹{Number(teacherPayoutControl.summary?.eligible_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></article>
                <article><small>Approved batches</small><b>{teacherPayoutControl.summary?.approved_batches||0}</b></article>
                <article><small>Paid amount</small><b>₹{Number(teacherPayoutControl.summary?.paid_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></article>
              </div>

              <div className="teacher-payout-inputs">
                <label>Finance note
                  <input value={teacherPayoutNote} onChange={e=>setTeacherPayoutNote(e.target.value)} placeholder="Internal note for batch creation / approval"/>
                </label>
                <label>UTR / external payment reference
                  <input value={teacherPayoutReference} onChange={e=>setTeacherPayoutReference(e.target.value)} placeholder="Required only when marking PAID"/>
                </label>
              </div>

              <div className="teacher-payout-ready">
                <div className="teacher-payout-subhead">
                  <div><span>ELIGIBLE TEACHER SETTLEMENTS</span><h4>{teacherPayoutSelected.length} selected</h4></div>
                  <button onClick={createTeacherPayoutBatch} disabled={teacherPayoutBusy||!teacherPayoutSelected.length}>Create DRAFT Payout Batch →</button>
                </div>
                <div className="teacher-payout-settlement-list">
                  {(teacherPayoutControl.eligible_settlements||[]).map(x=><label key={x.id} className={teacherPayoutSelected.includes(x.id)?'selected':''}>
                    <input type="checkbox" checked={teacherPayoutSelected.includes(x.id)} onChange={()=>toggleTeacherPayoutSettlement(x.id)}/>
                    <div><b>{x.teacher_name||'HOWDI Teacher'}</b><small>{x.howdi_id||'—'} · {x.hpay_account_code}</small></div>
                    <div><b>{x.settlement_number}</b><small>{x.earning_count||0} earning(s)</small></div>
                    <div><span>✓ KYC VERIFIED</span><small>Payout READY</small></div>
                    <strong>₹{Number(x.net_payable_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</strong>
                  </label>)}
                  {!(teacherPayoutControl.eligible_settlements||[]).length&&<div className="teacher-payout-empty">No teacher settlements are currently eligible for a payout batch.</div>}
                </div>
              </div>

              <div className="teacher-payout-batches">
                <div className="teacher-payout-subhead"><div><span>PAYOUT BATCHES</span><h4>Draft, approved and paid finance records</h4></div></div>
                <div className="teacher-payout-batch-list">
                  {(teacherPayoutControl.batches||[]).map(batch=><article key={batch.id}>
                    <div className="teacher-payout-batch-main">
                      <div><small>BATCH</small><b>{batch.batch_number}</b><span>{batch.teacher_count||0} teacher(s) · {batch.item_count||0} settlement(s)</span></div>
                      <div><small>STATUS</small><b className={`payout-batch-state ${String(batch.status||'').toLowerCase()}`}>{batch.status}</b><span>{batch.approved_by?`Approved by ${batch.approved_by}`:'Awaiting approval'}</span></div>
                      <div><small>TOTAL</small><strong>₹{Number(batch.total_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</strong><span>{batch.payment_reference||'No payment reference yet'}</span></div>
                      <div className="teacher-payout-actions">
                        {batch.status==='DRAFT'&&<button onClick={()=>actOnTeacherPayoutBatch(batch,'approve')} disabled={teacherPayoutBusy}>Approve Batch</button>}
                        {batch.status==='APPROVED'&&<button onClick={()=>actOnTeacherPayoutBatch(batch,'mark-paid')} disabled={teacherPayoutBusy}>Mark PAID</button>}
                        {batch.status==='PAID'&&<span className="paid-confirmation">✓ Finance confirmed</span>}
                      </div>
                    </div>
                    <div className="teacher-payout-batch-items">
                      {(batch.items||[]).map(item=><span key={item.settlement_id}><b>{item.teacher_name}</b> · {item.settlement_number} · ₹{Number(item.amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</span>)}
                    </div>
                  </article>)}
                  {!(teacherPayoutControl.batches||[]).length&&<div className="teacher-payout-empty">No teacher payout batches yet.</div>}
                </div>
              </div>

              <div className="teacher-payout-policy">
                <span>🔐</span>
                <div>
                  <b>HOWDI records payout confirmation; it does not perform the bank transfer in V19.19.</b>
                  <p>“Mark PAID” is allowed only after the batch is approved and an external UTR/payment reference is entered. That reference should come from the actual finance/provider payment process.</p>
                </div>
              </div>
            </section>

            <section className="panel teacher-settlement-control-v1918">
              <div className="teacher-settlement-head">
                <div>
                  <span className="eyebrow">V19.18 · TEACHER SETTLEMENT CONTROL</span>
                  <h3>Move eligible teaching earnings into governed HPay settlements.</h3>
                  <p>A settlement is an accounting step only. It does not transfer money to a bank account.</p>
                </div>
                <button className="secondary" onClick={loadTeacherSettlementControl} disabled={teacherSettlementBusy}>
                  {teacherSettlementBusy?'Refreshing…':'↻ Refresh settlements'}
                </button>
              </div>

              <div className="teacher-settlement-kpis">
                <article><small>Ready teachers</small><b>{teacherSettlementControl.summary?.ready_teachers||0}</b></article>
                <article><small>Blocked teachers</small><b>{teacherSettlementControl.summary?.blocked_teachers||0}</b></article>
                <article><small>Eligible amount</small><b>₹{Number(teacherSettlementControl.summary?.eligible_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></article>
                <article><small>Settlement amount</small><b>₹{Number(teacherSettlementControl.summary?.settlement_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></article>
              </div>

              <div className="teacher-settlement-note">
                <label>Optional finance note
                  <input value={teacherSettlementNote} onChange={e=>setTeacherSettlementNote(e.target.value)} placeholder="Internal settlement note"/>
                </label>
              </div>

              <div className="teacher-settlement-grid">
                <section>
                  <div className="teacher-settlement-subhead"><span>READY FOR SETTLEMENT</span><h4>VERIFIED KYC + READY payout setup + eligible earnings</h4></div>
                  <div className="teacher-settlement-list">
                    {(teacherSettlementControl.ready||[]).map(x=><article key={x.hpay_account_id}>
                      <div><b>{x.teacher_name||'HOWDI Teacher'}</b><small>{x.howdi_id||'—'} · {x.hpay_account_code}</small></div>
                      <div><b>{x.eligible_count||0} earnings</b><small>₹{Number(x.eligible_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</small></div>
                      <div><span className="settlement-ready">✓ KYC VERIFIED</span><small>{x.payout_method||'Payout method configured'}</small></div>
                      <button onClick={()=>createTeacherSettlement(x)} disabled={teacherSettlementBusy}>Create Settlement →</button>
                    </article>)}
                    {!(teacherSettlementControl.ready||[]).length&&<div className="teacher-settlement-empty">No teacher earnings are settlement-ready right now.</div>}
                  </div>
                </section>

                <section>
                  <div className="teacher-settlement-subhead"><span>BLOCKED</span><h4>Eligible earnings exist, but payout readiness is incomplete</h4></div>
                  <div className="teacher-settlement-list blocked">
                    {(teacherSettlementControl.blocked||[]).map(x=><article key={x.hpay_account_id}>
                      <div><b>{x.teacher_name||'HOWDI Teacher'}</b><small>{x.howdi_id||'—'} · {x.hpay_account_code}</small></div>
                      <div><b>₹{Number(x.eligible_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</b><small>{x.eligible_count||0} eligible earning(s)</small></div>
                      <div><span className="settlement-blocked">KYC {x.kyc_status||'PENDING'}</span><small>Payout {x.payout_status||'PENDING'}</small></div>
                      <button disabled>Blocked</button>
                    </article>)}
                    {!(teacherSettlementControl.blocked||[]).length&&<div className="teacher-settlement-empty">No blocked teacher settlements.</div>}
                  </div>
                </section>
              </div>

              <div className="teacher-settlement-history">
                <div className="teacher-settlement-subhead"><span>SETTLEMENT HISTORY</span><h4>Learn & Earn teacher settlement records</h4></div>
                <div className="teacher-settlement-table">
                  <div className="teacher-settlement-table-head"><span>Date</span><span>Teacher</span><span>Settlement</span><span>Earnings</span><span>Status</span><span>Amount</span></div>
                  {(teacherSettlementControl.settlements||[]).slice(0,100).map(x=><div className="teacher-settlement-table-row" key={x.id}>
                    <span>{new Date(x.created_at).toLocaleDateString('en-IN')}</span>
                    <div><b>{x.teacher_name||'HOWDI Teacher'}</b><small>{x.howdi_id||x.hpay_account_code}</small></div>
                    <div><b>{x.settlement_number}</b><small>{x.batch_number?`Batch ${x.batch_number}`:'Not yet in payout batch'}</small></div>
                    <span>{x.earning_count||0}</span>
                    <div><b>{x.payout_batch_status||x.status}</b><small>{x.payment_reference||'No bank/payment confirmation recorded'}</small></div>
                    <strong>₹{Number(x.net_payable_amount||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</strong>
                  </div>)}
                  {!(teacherSettlementControl.settlements||[]).length&&<div className="teacher-settlement-empty">No teacher settlements have been created yet.</div>}
                </div>
              </div>

              <div className="teacher-settlement-policy">
                <span>🏦</span>
                <div>
                  <b>Settlement is not payout.</b>
                  <p>V19.18 only groups eligible teacher earnings into an approved HPay settlement. Final payment confirmation remains inside the governed HPay payout-batch process and must carry an external payment reference when finance confirms payment.</p>
                </div>
              </div>
            </section>

            <section className="panel teacher-delivery-control-v1917">
              <div className="teacher-delivery-head">
                <div><span className="eyebrow">V19.17 · TEACHER DELIVERY VALIDATION</span><h3>Validate completed teaching before any teacher earning exists.</h3><p>HOWDI separates class completion from money creation. Admin must review the delivery and explicitly validate an earning amount.</p></div>
                <button className="secondary" onClick={loadTeacherDeliveryValidation} disabled={teacherDeliveryBusy}>{teacherDeliveryBusy?'Refreshing…':'↻ Refresh deliveries'}</button>
              </div>
              <div className="teacher-delivery-kpis">
                <article><small>Direct pending</small><b>{teacherDeliveryControl.summary?.direct_pending||0}</b></article>
                <article><small>Group pending</small><b>{teacherDeliveryControl.summary?.group_pending||0}</b></article>
                <article><small>Validated</small><b>{teacherDeliveryControl.summary?.validated||0}</b></article>
                <article><small>Not eligible</small><b>{teacherDeliveryControl.summary?.not_eligible||0}</b></article>
              </div>
              <div className="teacher-delivery-columns">
                <section><div className="teacher-delivery-subhead"><span>DIRECT DELIVERY</span><h4>Completed 1:1 / demo classes awaiting earning review</h4></div>
                  <div className="teacher-delivery-list">{(teacherDeliveryControl.direct||[]).map(x=><article key={x.source_id}><div><b>{x.teacher_name||'HOWDI Teacher'}</b><small>{x.teacher_howdi_id||'—'} · {x.course_title||'General learning'}</small></div><div><b>{x.booking_code}</b><small>{x.session_type} · {x.attended_minutes||0} min</small></div><small>{new Date(x.scheduled_start).toLocaleString('en-IN')}</small><button onClick={()=>openTeacherDeliveryReview(x)}>Review →</button></article>)}</div>
                </section>
                <section><div className="teacher-delivery-subhead"><span>GROUP DELIVERY</span><h4>Completed batch sessions awaiting earning review</h4></div>
                  <div className="teacher-delivery-list">{(teacherDeliveryControl.groups||[]).map(x=><article key={x.source_id}><div><b>{x.teacher_name||'HOWDI Teacher'}</b><small>{x.teacher_howdi_id||'—'} · {x.course_title||'General learning'}</small></div><div><b>{x.session_code||x.batch_code}</b><small>{x.batch_title||'Batch'} · {x.attended_count||0}/{x.roster_count||0} attended</small></div><small>{new Date(x.starts_at).toLocaleString('en-IN')}</small><button onClick={()=>openTeacherDeliveryReview(x)}>Review →</button></article>)}</div>
                </section>
              </div>
              <div className="teacher-delivery-policy"><span>🛡️</span><div><b>Completed class ≠ automatic teacher money.</b><p>Only Admin-validated delivery creates a teacher earning ledger entry. HPay status becomes ELIGIBLE only when teacher KYC is VERIFIED and payout readiness is READY; otherwise it stays on HOLD. No bank transfer happens here.</p></div></div>
              {teacherDeliverySelected&&<div className="teacher-delivery-review">
                <div className="teacher-delivery-review-head"><div><span className="eyebrow">DELIVERY REVIEW</span><h4>{teacherDeliverySelected.teacher_name} · {teacherDeliverySelected.delivery_type}</h4></div><button className="secondary" onClick={()=>setTeacherDeliverySelected(null)}>Close</button></div>
                <div className="teacher-delivery-review-grid">
                  <label>Decision<select value={teacherDeliveryForm.decision} onChange={e=>setTeacherDeliveryForm({...teacherDeliveryForm,decision:e.target.value})}><option>VALIDATED</option><option>NOT_ELIGIBLE</option></select></label>
                  <label>Earning amount ₹<input type="number" min="0" value={teacherDeliveryForm.amount} disabled={teacherDeliveryForm.decision!=="VALIDATED"} onChange={e=>setTeacherDeliveryForm({...teacherDeliveryForm,amount:e.target.value})}/></label>
                  <label className="wide">Reason / validation note<textarea value={teacherDeliveryForm.reason} onChange={e=>setTeacherDeliveryForm({...teacherDeliveryForm,reason:e.target.value})}/></label>
                </div>
                <div className="teacher-delivery-review-foot"><span>This action is audited through the delivery review record.</span><button onClick={saveTeacherDeliveryReview} disabled={teacherDeliveryBusy}>Save Delivery Decision</button></div>
              </div>}
            </section>

            <section className="panel learn-admin-security-v1914">
              <div className="learn-admin-security-head">
                <div><span className="eyebrow">V19.14 · ADMIN SESSION SECURITY</span><h3>Learn & Earn admin routes now require a real server-side session.</h3><p>Admin tokens are hashed in PostgreSQL, automatically expire and can be revoked. Invalid sessions return the Admin UI to sign-in.</p></div>
                <div className="learn-admin-security-actions"><button className="secondary" onClick={loadLearnAdminSecurity} disabled={learnAdminSecurityBusy}>↻ Refresh</button><button onClick={revokeOtherLearnAdminSessions} disabled={learnAdminSecurityBusy}>Revoke Other Sessions</button></div>
              </div>
              <div className="learn-admin-security-kpis">
                <article><small>Current session</small><b>{learnAdminSecurity.current_session?'ACTIVE':'—'}</b></article>
                <article><small>Active sessions</small><b>{learnAdminSecurity.active_sessions?.length||0}</b></article>
                <article><small>Session lifetime</small><b>{learnAdminSecurity.policy?.default_session_hours||12}h</b></article>
                <article><small>Token storage</small><b>HASHED</b></article>
              </div>
              {learnAdminSecurity.current_session&&<div className="learn-admin-current-session">
                <div><small>ADMIN</small><b>{learnAdminSecurity.current_session.username}</b></div>
                <div><small>IP</small><b>{learnAdminSecurity.current_session.ip_address||'—'}</b></div>
                <div><small>LAST SEEN</small><b>{new Date(learnAdminSecurity.current_session.last_seen_at).toLocaleString('en-IN')}</b></div>
                <div><small>EXPIRES</small><b>{new Date(learnAdminSecurity.current_session.expires_at).toLocaleString('en-IN')}</b></div>
              </div>}
              <div className="learn-admin-security-grid">
                <section><div className="learn-admin-security-subhead"><span>ACTIVE SESSIONS</span><h4>Signed-in admin browsers</h4></div>
                  <div className="learn-admin-session-list">{(learnAdminSecurity.active_sessions||[]).map(s=><article key={s.id}><div><b>{s.username}</b><small>{s.ip_address||'Unknown IP'}</small></div><span>{s.is_current?'THIS BROWSER':'OTHER SESSION'}</span><small>Last seen {new Date(s.last_seen_at).toLocaleString('en-IN')}</small><small>Expires {new Date(s.expires_at).toLocaleString('en-IN')}</small></article>)}</div>
                </section>
                <section><div className="learn-admin-security-subhead"><span>SECURITY AUDIT</span><h4>Recent authentication activity</h4></div>
                  <div className="learn-admin-audit-list">{(learnAdminSecurity.recent_audit||[]).slice(0,30).map(a=><article key={a.id}><div><b>{String(a.action||'').replaceAll('_',' ')}</b><small>{a.method||'—'} {a.path||''}</small></div><span>{a.ip_address||'—'}</span><small>{new Date(a.created_at).toLocaleString('en-IN')}</small></article>)}</div>
                </section>
              </div>
              <div className="learn-admin-security-policy"><span>🛡️</span><div><b>Scoped production hardening.</b><p>V19.14 protects Learn & Earn and HPay Learn & Earn admin APIs first. Other legacy Admin modules are intentionally unchanged so existing operations are not broken during this security migration.</p></div></div>
            </section>

            <section className="panel learn-access-health-v1913">
              <div className="learn-access-health-head">
                <div><span className="eyebrow">V19.13 · ACCESS HEALTH + RECONCILIATION</span><h3>Keep plan subscriptions and course entitlements synchronized.</h3><p>Expired or cancelled subscription access is kept separate from purchased course ownership. Purchased access is never revoked by subscription reconciliation.</p></div>
                <div className="learn-access-health-actions"><button className="secondary" onClick={loadLearnAccessHealth} disabled={learnAccessHealthBusy}>↻ Refresh</button><button onClick={runLearnAccessReconciliation} disabled={learnAccessHealthBusy}>{learnAccessHealthBusy?'Working…':'Run Reconciliation'}</button></div>
              </div>
              <div className="learn-access-health-kpis">
                <article><small>Active subscriptions</small><b>{learnAccessHealth.summary?.active_subscriptions||0}</b></article>
                <article><small>Overdue expiry</small><b>{learnAccessHealth.summary?.overdue_expiry||0}</b></article>
                <article><small>Payment required</small><b>{learnAccessHealth.summary?.payment_required||0}</b></article>
                <article><small>Active sub entitlements</small><b>{learnAccessHealth.summary?.active_subscription_entitlements||0}</b></article>
                <article><small>Purchase protected</small><b>{learnAccessHealth.summary?.active_purchase_entitlements||0}</b></article>
                <article><small>Mismatches</small><b>{learnAccessHealth.summary?.mismatch_count||0}</b></article>
              </div>
              {learnAccessReconcileResult&&<div className="learn-access-health-result">
                <span>✓ Last reconciliation</span>
                <b>{learnAccessReconcileResult.expired_subscriptions||0} expired</b>
                <b>{learnAccessReconcileResult.revoked_subscription_entitlements||0} revoked</b>
                <b>{learnAccessReconcileResult.repaired_entitlements||0} repaired</b>
                <b>{learnAccessReconcileResult.created_missing_entitlements||0} created</b>
              </div>}
              <div className="learn-access-health-table">
                <div className="head"><span>Learner</span><span>Plan</span><span>Plan courses</span><span>Active access</span><span>Ends</span></div>
                {(learnAccessHealth.mismatches||[]).map(x=><article key={x.subscription_id}>
                  <div><b>{x.full_name||'HOWDI Learner'}</b><small>{x.howdi_id||x.user_id}</small></div>
                  <b>{x.plan_name}</b>
                  <span>{x.plan_courses}</span>
                  <span>{x.active_entitlements}</span>
                  <small>{x.ends_at?new Date(x.ends_at).toLocaleString('en-IN'):'No expiry'}</small>
                </article>)}
                {!learnAccessHealthBusy&&!learnAccessHealth.mismatches?.length&&<div className="learn-empty">No active access mismatches detected.</div>}
              </div>
              <div className="learn-access-health-policy"><span>🛡️</span><div><b>Purchase ownership is protected.</b><p>Reconciliation only expires or revokes subscription-owned entitlements. It does not revoke a separately purchased course entitlement.</p></div></div>
            </section>

            <section className="panel learn-hpay-economy-v1912">
              <div className="learn-hpay-admin-head">
                <div><span className="eyebrow">V19.12 · HPAY LEARN & EARN ECONOMY</span><h3>Govern learner rewards and teacher earning readiness without manufacturing money.</h3><p>HOWDI keeps learning proof, reward rules, teacher delivery earnings, settlement states and actual payout records separate.</p></div>
                <div className="learn-hpay-admin-actions"><button className="secondary" onClick={loadLearnHpayEconomy} disabled={learnHpayBusy}>↻ Refresh</button><button onClick={syncLearnHpayRewards} disabled={learnHpayBusy}>{learnHpayBusy?'Working…':'Sync eligible rewards'}</button></div>
              </div>
              <div className="learn-hpay-admin-kpis">
                <article><small>Learner rewards</small><b>₹{Number(learnHpayEconomy.learner_rewards?.totals?.rewards||0).toLocaleString('en-IN')}</b><span>{learnHpayEconomy.learner_rewards?.totals?.reward_count||0} records</span></article>
                <article><small>Learner pending</small><b>₹{Number(learnHpayEconomy.learner_rewards?.totals?.pending||0).toLocaleString('en-IN')}</b><span>Hold / eligible</span></article>
                <article><small>Learner paid</small><b>₹{Number(learnHpayEconomy.learner_rewards?.totals?.paid||0).toLocaleString('en-IN')}</b><span>Recorded paid settlements</span></article>
                <article><small>Teacher eligible</small><b>₹{Number(learnHpayEconomy.teacher_summary?.teacher_eligible||0).toLocaleString('en-IN')}</b><span>Validated earning states</span></article>
                <article><small>Teacher pending</small><b>₹{Number(learnHpayEconomy.teacher_summary?.teacher_pending||0).toLocaleString('en-IN')}</b><span>Pending / hold / review</span></article>
              </div>
              <details className="learn-hpay-rule-create">
                <summary>＋ Create course reward rule</summary>
                <div className="learn-hpay-rule-grid">
                  <label>Course<select value={learnHpayRule.course_id} onChange={e=>setLearnHpayRule({...learnHpayRule,course_id:e.target.value})}><option value="">Choose course</option>{(learnHpayEconomy.learner_rewards?.courses||[]).map(c=><option key={c.id} value={c.id}>{c.title} · Active ₹{Number(c.active_reward||0)}</option>)}</select></label>
                  <label>Reward amount ₹<input type="number" min="0" step="1" value={learnHpayRule.reward_amount} onChange={e=>setLearnHpayRule({...learnHpayRule,reward_amount:e.target.value})}/></label>
                  <label>Status<select value={learnHpayRule.reward_status} onChange={e=>setLearnHpayRule({...learnHpayRule,reward_status:e.target.value})}><option>DISABLED</option><option>ENABLED</option></select></label>
                  <label>Effective from<input type="datetime-local" value={learnHpayRule.effective_from} onChange={e=>setLearnHpayRule({...learnHpayRule,effective_from:e.target.value})}/></label>
                  <label>Effective until<input type="datetime-local" value={learnHpayRule.effective_until} onChange={e=>setLearnHpayRule({...learnHpayRule,effective_until:e.target.value})}/></label>
                  <label className="wide">Admin note<textarea value={learnHpayRule.admin_note} onChange={e=>setLearnHpayRule({...learnHpayRule,admin_note:e.target.value})} placeholder="Why this reward exists, campaign period, funding approval…"/></label>
                </div>
                <div className="learn-hpay-rule-foot"><span>Every save creates a new version. Enabling a rule disables the previous enabled rule for the course.</span><button onClick={createLearnHpayRewardRule} disabled={learnHpayBusy}>Save Reward Rule</button></div>
              </details>
              <div className="learn-hpay-admin-columns">
                <section>
                  <div className="learn-hpay-admin-section-head"><span>LEARNER REWARD RULES</span><h4>Course-by-course reward governance</h4></div>
                  <div className="learn-hpay-rule-list">{(learnHpayEconomy.learner_rewards?.rules||[]).slice(0,60).map(r=><article key={r.id}><div><b>{r.course_title}</b><small>Rule V{r.rule_version} · {r.category||'Learning'}</small></div><strong>₹{Number(r.reward_amount||0).toLocaleString('en-IN')}</strong><em className={String(r.reward_status).toLowerCase()}>{r.reward_status}</em><small>{r.admin_note||'No admin note'}</small></article>)}</div>
                </section>
                <section>
                  <div className="learn-hpay-admin-section-head"><span>TEACHER EARNING READINESS</span><h4>Visibility only — not automatic payout</h4></div>
                  <div className="learn-hpay-teacher-list">{(learnHpayEconomy.teachers||[]).map(t=><article key={t.id}><div><b>{t.display_name||t.email||'HOWDI Teacher'}</b><small>{t.howdi_id||'—'} · KYC {t.kyc_status||'PENDING'}</small></div><span>₹{Number(t.eligible_amount||0).toLocaleString('en-IN')} eligible</span><span>₹{Number(t.pending_amount||0).toLocaleString('en-IN')} pending</span><em>{t.payout_status||'HOLD'}</em></article>)}</div>
                </section>
              </div>
              <div className="learn-hpay-admin-policy"><span>🛡️</span><div><b>No automatic cash creation.</b><p>Learner reward money exists only when Admin has explicitly enabled a positive reward rule and the qualifying completion is verified. Teacher earning visibility comes from validated delivery ledgers. Payout readiness does not itself transfer money to a bank.</p></div></div>
            </section>

            <section className="panel learn-ai-vision-control-v1911">
              <div className="learn-ai-vision-admin-head">
                <div><span className="eyebrow">V19.11 · AI VISION GOVERNANCE</span><h3>Visual evidence assistance with human teacher control.</h3><p>See when AI Vision was used on learner image evidence. AI analysis never approves proof, creates Skill Passport evidence or issues certificates by itself.</p></div>
                <button className="secondary" onClick={loadLearnAiVisionControl} disabled={learnAiVisionBusy}>{learnAiVisionBusy?'Refreshing…':'↻ Refresh AI Vision'}</button>
              </div>
              <div className="learn-ai-vision-provider"><span className={learnAiVisionControl.provider?.configured?'on':'off'}>{learnAiVisionControl.provider?.configured?'● CONNECTED':'○ NOT CONFIGURED'}</span><b>{learnAiVisionControl.provider?.model||'OpenAI model'}</b><small>Teacher-side image evidence assistant</small></div>
              <div className="learn-ai-vision-kpis">
                <article><small>Total analyses</small><b>{learnAiVisionControl.summary?.total||0}</b></article>
                <article><small>Draft</small><b>{learnAiVisionControl.summary?.draft||0}</b></article>
                <article><small>Used by teacher</small><b>{learnAiVisionControl.summary?.used||0}</b></article>
                <article><small>Discarded</small><b>{learnAiVisionControl.summary?.discarded||0}</b></article>
              </div>
              <div className="learn-ai-vision-list">
                {(learnAiVisionControl.reviews||[]).map(v=><article key={v.id}>
                  <div><small>{v.evidence_type} · {v.course_title||'HOWDI Learning'}</small><b>{v.learner_name||'HOWDI Learner'}</b><span>{v.howdi_id||'—'}</span></div>
                  <div><small>Teacher</small><b>{v.teacher_name||'HOWDI Teacher'}</b><span>{v.model||'AI model'}</span></div>
                  <div><small>AI summary</small><p>{v.structured_analysis?.summary||'No structured summary'}</p></div>
                  <em className={String(v.status).toLowerCase().replaceAll('_','-')}>{String(v.status).replaceAll('_',' ')}</em>
                  <small>{new Date(v.created_at).toLocaleString('en-IN')}</small>
                </article>)}
                {!learnAiVisionBusy&&!learnAiVisionControl.reviews?.length&&<div className="learn-empty">No AI Vision analyses yet. Teachers can use it on image-based Practice & Proof submissions.</div>}
              </div>
              <div className="learn-ai-vision-policy"><span>🛡️</span><div><b>Human review stays mandatory.</b><p>AI Vision only describes visible evidence and drafts feedback. Teacher review remains the only path to APPROVED evidence and verified Skill Passport proof.</p></div></div>
            </section>

            <section className="panel learn-partner-control-v1910">
              <div className="learn-partner-head">
                <div><span className="eyebrow">V19.10 · COMMUNITY / SHG / INSTITUTION BRIDGE</span><h3>Bring verified partner organizations into HOWDI learning and opportunity programs.</h3><p>Manage SHGs, NGOs, schools, colleges, institutes, employers and community programs without pretending an external system integration exists.</p></div>
                <button className="secondary" onClick={loadLearnPartnerControl} disabled={learnPartnerBusy}>{learnPartnerBusy?'Refreshing…':'↻ Refresh partners'}</button>
              </div>

              <div className="learn-partner-kpis">
                <article><small>Partners</small><b>{learnPartnerControl.partners.length}</b></article>
                <article><small>Verified + Active</small><b>{learnPartnerControl.partners.filter(x=>x.status==='ACTIVE'&&x.verification_status==='VERIFIED').length}</b></article>
                <article><small>Programs</small><b>{learnPartnerControl.programs.length}</b></article>
                <article><small>Published</small><b>{learnPartnerControl.programs.filter(x=>x.status==='PUBLISHED').length}</b></article>
                <article><small>Member records</small><b>{learnPartnerControl.members.length}</b></article>
              </div>

              <details className="learn-partner-create">
                <summary>＋ Add partner organization</summary>
                <div className="learn-partner-form">
                  <label>Partner name<input value={learnPartnerForm.name} onChange={e=>setLearnPartnerForm({...learnPartnerForm,name:e.target.value})}/></label>
                  <label>Type<select value={learnPartnerForm.partner_type} onChange={e=>setLearnPartnerForm({...learnPartnerForm,partner_type:e.target.value})}><option>SHG</option><option>NGO</option><option>SCHOOL</option><option>COLLEGE</option><option>TRAINING_INSTITUTE</option><option>EMPLOYER</option><option>COMMUNITY</option><option>GOVERNMENT_BODY</option><option>OTHER</option></select></label>
                  <label>Contact name<input value={learnPartnerForm.contact_name} onChange={e=>setLearnPartnerForm({...learnPartnerForm,contact_name:e.target.value})}/></label>
                  <label>Email<input value={learnPartnerForm.contact_email} onChange={e=>setLearnPartnerForm({...learnPartnerForm,contact_email:e.target.value})}/></label>
                  <label>Phone<input value={learnPartnerForm.contact_phone} onChange={e=>setLearnPartnerForm({...learnPartnerForm,contact_phone:e.target.value})}/></label>
                  <label>City<input value={learnPartnerForm.city} onChange={e=>setLearnPartnerForm({...learnPartnerForm,city:e.target.value})}/></label>
                  <label>State<input value={learnPartnerForm.state} onChange={e=>setLearnPartnerForm({...learnPartnerForm,state:e.target.value})}/></label>
                  <label>Country<input value={learnPartnerForm.country} onChange={e=>setLearnPartnerForm({...learnPartnerForm,country:e.target.value})}/></label>
                  <label className="wide">Description<textarea value={learnPartnerForm.description} onChange={e=>setLearnPartnerForm({...learnPartnerForm,description:e.target.value})}/></label>
                </div>
                <div className="learn-partner-create-foot"><span>New partners start <b>DRAFT + UNVERIFIED</b>.</span><button onClick={createLearnPartner} disabled={learnPartnerBusy}>Save Partner</button></div>
              </details>

              <div className="learn-partner-list">
                {learnPartnerControl.partners.map(p=><article key={p.id}>
                  <div><em className={String(p.partner_type).toLowerCase()}>{String(p.partner_type).replaceAll("_"," ")}</em><small>{p.partner_code}</small><h4>{p.name}</h4><p>{[p.city,p.state,p.country].filter(Boolean).join(", ")||"Location not set"}</p></div>
                  <div className="learn-partner-status"><b>{p.verification_status}</b><small>{p.status}</small></div>
                  <div><span>{p.program_count||0} programs</span><span>{p.member_count||0} members</span></div>
                  <div className="learn-partner-actions">
                    {p.verification_status!=='VERIFIED'&&<button onClick={()=>governLearnPartner(p,null,'VERIFIED')}>Verify</button>}
                    {p.status!=='ACTIVE'&&<button className="activate" onClick={()=>governLearnPartner(p,'ACTIVE',null)}>Activate</button>}
                    {p.status==='ACTIVE'&&<button onClick={()=>governLearnPartner(p,'INACTIVE',null)}>Deactivate</button>}
                  </div>
                </article>)}
              </div>

              <details className="learn-partner-create">
                <summary>＋ Create partner program</summary>
                <div className="learn-partner-form">
                  <label>Partner<select value={learnPartnerProgramForm.partner_id} onChange={e=>setLearnPartnerProgramForm({...learnPartnerProgramForm,partner_id:e.target.value})}><option value="">Choose partner</option>{learnPartnerControl.partners.map(p=><option key={p.id} value={p.id}>{p.name} · {p.partner_type}</option>)}</select></label>
                  <label>Program title<input value={learnPartnerProgramForm.title} onChange={e=>setLearnPartnerProgramForm({...learnPartnerProgramForm,title:e.target.value})}/></label>
                  <label>Type<select value={learnPartnerProgramForm.program_type} onChange={e=>setLearnPartnerProgramForm({...learnPartnerProgramForm,program_type:e.target.value})}><option>SKILL_COHORT</option><option>SPONSORED_LEARNING</option><option>PLACEMENT_DRIVE</option><option>COMMUNITY_PROJECT</option><option>WORKSHOP</option><option>OTHER</option></select></label>
                  <label>Visibility<select value={learnPartnerProgramForm.visibility} onChange={e=>setLearnPartnerProgramForm({...learnPartnerProgramForm,visibility:e.target.value})}><option>PRIVATE</option><option>PUBLIC</option></select></label>
                  <label>Target group<input value={learnPartnerProgramForm.target_group} onChange={e=>setLearnPartnerProgramForm({...learnPartnerProgramForm,target_group:e.target.value})}/></label>
                  <label>Seats<input type="number" min="1" value={learnPartnerProgramForm.seats} onChange={e=>setLearnPartnerProgramForm({...learnPartnerProgramForm,seats:e.target.value})}/></label>
                  <label>Starts<input type="datetime-local" value={learnPartnerProgramForm.starts_at} onChange={e=>setLearnPartnerProgramForm({...learnPartnerProgramForm,starts_at:e.target.value})}/></label>
                  <label>Ends<input type="datetime-local" value={learnPartnerProgramForm.ends_at} onChange={e=>setLearnPartnerProgramForm({...learnPartnerProgramForm,ends_at:e.target.value})}/></label>
                  <label className="wide">Description<textarea value={learnPartnerProgramForm.description} onChange={e=>setLearnPartnerProgramForm({...learnPartnerProgramForm,description:e.target.value})}/></label>
                  <div className="wide learn-partner-course-pick"><b>Attach courses</b><div>{(learnCourses||[]).map(c=><label key={c.id}><input type="checkbox" checked={learnPartnerProgramForm.course_ids.includes(c.id)} onChange={e=>setLearnPartnerProgramForm({...learnPartnerProgramForm,course_ids:e.target.checked?[...learnPartnerProgramForm.course_ids,c.id]:learnPartnerProgramForm.course_ids.filter(id=>id!==c.id)})}/><span>{c.title}</span></label>)}</div></div>
                  <div className="wide learn-partner-course-pick"><b>Attach opportunities</b><div>{(learnOpportunityControl.opportunities||[]).map(o=><label key={o.id}><input type="checkbox" checked={learnPartnerProgramForm.opportunity_ids.includes(o.id)} onChange={e=>setLearnPartnerProgramForm({...learnPartnerProgramForm,opportunity_ids:e.target.checked?[...learnPartnerProgramForm.opportunity_ids,o.id]:learnPartnerProgramForm.opportunity_ids.filter(id=>id!==o.id)})}/><span>{o.title}</span></label>)}</div></div>
                </div>
                <div className="learn-partner-create-foot"><span>Programs start as <b>DRAFT</b>.</span><button onClick={createLearnPartnerProgram} disabled={learnPartnerBusy}>Save Program</button></div>
              </details>

              <div className="learn-partner-programs">
                {learnPartnerControl.programs.map(pr=><article key={pr.id}>
                  <div><small>{pr.partner_name} · {pr.partner_type}</small><h4>{pr.title}</h4><p>{pr.program_type.replaceAll("_"," ")} · {pr.visibility}</p></div>
                  <em className={String(pr.status).toLowerCase()}>{pr.status}</em>
                  <div><b>{pr.interested_count||0}</b><small>interested</small><span>{pr.active_member_count||0} approved/active</span></div>
                  <div className="learn-partner-actions">{pr.status==='DRAFT'&&<button className="activate" onClick={()=>updateLearnPartnerProgramStatus(pr,'PUBLISHED')}>Publish</button>}{pr.status==='PUBLISHED'&&<button onClick={()=>updateLearnPartnerProgramStatus(pr,'CLOSED')}>Close</button>}</div>
                </article>)}
              </div>

              <div className="learn-partner-members">
                <div><span className="eyebrow">PROGRAM MEMBERS</span><h4>Review learner program interest</h4></div>
                {learnPartnerControl.members.map(m=><article key={m.id}>
                  <div><b>{m.full_name}</b><small>{m.howdi_id||m.email||"—"}</small></div><div><b>{m.program_title}</b><small>{m.partner_name}</small></div><em className={String(m.status).toLowerCase()}>{m.status}</em>
                  <div className="learn-partner-actions">{m.status==='INTERESTED'&&<><button className="activate" onClick={()=>updateLearnPartnerMemberStatus(m,'APPROVED')}>Approve</button><button onClick={()=>updateLearnPartnerMemberStatus(m,'WAITLISTED')}>Waitlist</button><button onClick={()=>updateLearnPartnerMemberStatus(m,'DECLINED')}>Decline</button></>}{m.status==='APPROVED'&&<button className="activate" onClick={()=>updateLearnPartnerMemberStatus(m,'ACTIVE')}>Start</button>}{m.status==='ACTIVE'&&<button className="activate" onClick={()=>updateLearnPartnerMemberStatus(m,'COMPLETED')}>Complete</button>}</div>
                </article>)}
              </div>

              <div className="learn-partner-policy"><span>🛡️</span><div><b>Verification before publication.</b><p>Only ACTIVE + VERIFIED partner organizations can publish programs. Partner approval, program participation and attached opportunities remain governed HOWDI records—not claims of guaranteed employment, funding or government affiliation.</p></div></div>
            </section>

            <section className="panel learn-pipeline-control-v199">
              <div className="learn-pipeline-admin-head">
                <div><span className="eyebrow">V19.9 · OPPORTUNITY PIPELINE</span><h3>Turn learner interest into a transparent, governed opportunity journey.</h3><p>Track Interest → Shortlist → Selection → Completion without treating any stage as a guaranteed job or income outcome.</p></div>
                <button className="secondary" onClick={loadLearnOpportunityPipeline} disabled={learnOpportunityPipelineBusy}>{learnOpportunityPipelineBusy?'Refreshing…':'↻ Refresh pipeline'}</button>
              </div>
              <div className="learn-pipeline-kpis">
                <article><small>Interested</small><b>{learnOpportunityPipeline.summary?.interested||0}</b></article>
                <article><small>Shortlisted</small><b>{learnOpportunityPipeline.summary?.shortlisted||0}</b></article>
                <article><small>Selected</small><b>{learnOpportunityPipeline.summary?.selected||0}</b></article>
                <article><small>Completed</small><b>{learnOpportunityPipeline.summary?.completed||0}</b></article>
                <article><small>Follow-ups due</small><b>{learnOpportunityPipeline.summary?.followups_due||0}</b></article>
              </div>
              <div className="learn-pipeline-filters">{["ACTIVE","INTERESTED","SHORTLISTED","SELECTED","COMPLETED","DECLINED","ALL"].map(x=><button key={x} className={learnOpportunityPipelineFilter===x?"active":""} onClick={()=>setLearnOpportunityPipelineFilter(x)}>{x.replaceAll("_"," ")}</button>)}</div>
              <div className="learn-pipeline-list">
                {(learnOpportunityPipeline.pipeline||[]).filter(x=>learnOpportunityPipelineFilter==="ALL"||(learnOpportunityPipelineFilter==="ACTIVE"?!["COMPLETED","DECLINED"].includes(x.status):x.status===learnOpportunityPipelineFilter)).map(item=><article key={item.id}>
                  <div className="learn-pipeline-person"><b>{item.full_name||"HOWDI Learner"}</b><small>{item.howdi_id||item.email||"—"}</small><span>{item.verified_evidence_count||0} verified proof · {item.verified_project_count||0} projects</span></div>
                  <div><b>{item.opportunity_title}</b><small>{item.organization_name||"HOWDI Opportunity"} · {String(item.opportunity_type||"").replaceAll("_"," ")}</small></div>
                  <div className="learn-pipeline-match"><b>{item.match_score||0}%</b><small>{item.match_label||"Proof match"}</small></div>
                  <em className={String(item.status).toLowerCase()}>{item.status}</em>
                  <div className="learn-pipeline-next"><b>{item.next_action||"No next action"}</b><small>{item.next_action_at?new Date(item.next_action_at).toLocaleString("en-IN"):"—"}</small></div>
                  <button onClick={()=>openLearnOpportunityPipeline(item)}>Review →</button>
                </article>)}
              </div>
              {learnOpportunityPipelineSelected&&<div className="learn-pipeline-editor">
                <div className="learn-pipeline-editor-head"><div><span className="eyebrow">PIPELINE REVIEW</span><h4>{learnOpportunityPipelineSelected.full_name} · {learnOpportunityPipelineSelected.opportunity_title}</h4></div><button className="secondary" onClick={()=>setLearnOpportunityPipelineSelected(null)}>Close</button></div>
                <div className="learn-pipeline-editor-grid">
                  <label>Stage<select value={learnOpportunityPipelineForm.status} onChange={e=>setLearnOpportunityPipelineForm({...learnOpportunityPipelineForm,status:e.target.value})}><option>INTERESTED</option><option>SHORTLISTED</option><option>SELECTED</option><option>COMPLETED</option><option>DECLINED</option></select></label>
                  <label>Next action<input value={learnOpportunityPipelineForm.next_action} onChange={e=>setLearnOpportunityPipelineForm({...learnOpportunityPipelineForm,next_action:e.target.value})} placeholder="Interview / demo / document review"/></label>
                  <label>Follow-up time<input type="datetime-local" value={learnOpportunityPipelineForm.next_action_at} onChange={e=>setLearnOpportunityPipelineForm({...learnOpportunityPipelineForm,next_action_at:e.target.value})}/></label>
                  <label>Outcome type<select value={learnOpportunityPipelineForm.outcome_type} onChange={e=>setLearnOpportunityPipelineForm({...learnOpportunityPipelineForm,outcome_type:e.target.value})}><option value="">Not recorded</option><option>PROJECT_COMPLETED</option><option>PLACEMENT_RECORDED</option><option>INTERNSHIP_COMPLETED</option><option>GIG_COMPLETED</option><option>OTHER</option></select></label>
                  <label className="wide">Stage note<textarea value={learnOpportunityPipelineForm.stage_note} onChange={e=>setLearnOpportunityPipelineForm({...learnOpportunityPipelineForm,stage_note:e.target.value})}/></label>
                  <label className="wide">Outcome note<textarea value={learnOpportunityPipelineForm.outcome_note} onChange={e=>setLearnOpportunityPipelineForm({...learnOpportunityPipelineForm,outcome_note:e.target.value})} placeholder="Required when recording a meaningful completed outcome"/></label>
                </div>
                <div className="learn-pipeline-editor-foot"><span>Allowed transitions are enforced by backend.</span><button onClick={saveLearnOpportunityPipeline} disabled={learnOpportunityPipelineBusy}>Save Pipeline Update</button></div>
              </div>}
              <div className="learn-pipeline-policy"><span>🛡️</span><div><b>Selection is a process state, not a promise.</b><p>HOWDI records verified workflow outcomes without claiming employment, salary, project success or income unless the underlying event has actually occurred and is recorded by Admin.</p></div></div>
            </section>

            <section className="panel learn-market-control-v198">
              <div className="learn-market-admin-head">
                <div><span className="eyebrow">V19.8 · HOWDI MARKET INTELLIGENCE</span><h3>See demand, proof supply and learner interest inside HOWDI.</h3><p>This dashboard uses first-party HOWDI opportunity and verified-learning data only. It is an operating signal, not an external labour-market or salary benchmark.</p></div>
                <button className="secondary" onClick={loadLearnMarketIntelligence} disabled={learnMarketBusy}>{learnMarketBusy?'Refreshing…':'↻ Refresh signals'}</button>
              </div>

              <div className="learn-market-admin-kpis">
                <article><small>Active opportunities</small><b>{learnMarketIntel.summary?.active_opportunities||0}</b><span>Current published supply</span></article>
                <article><small>Tracked skills</small><b>{learnMarketIntel.summary?.tracked_skills||0}</b><span>Opportunity skill terms</span></article>
                <article><small>Learners with proof</small><b>{learnMarketIntel.summary?.learners_with_verified_proof||0}</b><span>Verified Skill Passport supply</span></article>
                <article><small>Verified evidence</small><b>{learnMarketIntel.summary?.verified_evidence||0}</b><span>Total proof records</span></article>
              </div>

              <div className="learn-market-admin-columns">
                <section>
                  <div className="learn-market-admin-section-head"><div><span>SKILL GAP SIGNALS</span><h4>Opportunity demand vs verified learner proof</h4></div></div>
                  <div className="learn-market-admin-table skill">
                    <div className="head"><span>Skill</span><span>Opportunities</span><span>Verified learners</span><span>Signal</span></div>
                    {(learnMarketIntel.skill_signals||[]).slice(0,30).map(x=><article key={x.skill}><b>{x.skill}</b><span>{x.active_opportunities}</span><span>{x.verified_learners}</span><em className={String(x.supply_state||'COVERED').toLowerCase().replaceAll('_','-')}>{String(x.supply_state||'COVERED').replaceAll('_',' ')}</em></article>)}
                    {!learnMarketIntel.skill_signals?.length&&<div className="learn-empty">No skill-demand signals yet. Publish opportunities with required skill terms.</div>}
                  </div>
                </section>

                <section>
                  <div className="learn-market-admin-section-head"><div><span>LEARNER INTEREST</span><h4>Which published opportunities attract attention</h4></div></div>
                  <div className="learn-market-admin-table interest">
                    <div className="head"><span>Opportunity</span><span>Interests</span><span>Shortlisted</span><span>Selected</span></div>
                    {(learnMarketIntel.opportunity_interest_signals||[]).slice(0,20).map(x=><article key={x.id}><div><b>{x.title}</b><small>{x.opportunity_type} · {x.location_mode}</small></div><span>{x.total_interests}</span><span>{x.shortlisted}</span><span>{x.selected}</span></article>)}
                    {!learnMarketIntel.opportunity_interest_signals?.length&&<div className="learn-empty">No learner-interest signals yet.</div>}
                  </div>
                </section>
              </div>

              <section className="learn-market-course-signals">
                <div className="learn-market-admin-section-head"><div><span>COURSE → OPPORTUNITY BRIDGE</span><h4>Where learning proof meets active opportunity demand</h4></div></div>
                <div>{(learnMarketIntel.course_signals||[]).slice(0,30).map(c=><article key={c.id}><div><b>{c.title}</b><small>Course signal</small></div><span><strong>{c.linked_opportunities}</strong> linked opportunities</span><span><strong>{c.learners_with_verified_proof}</strong> learners with verified proof</span></article>)}</div>
              </section>

              <div className="learn-market-admin-policy"><span>🛡️</span><div><b>Internal signal only.</b><p>Do not label these numbers as national demand, market salary, hiring probability or guaranteed future work. They summarize current HOWDI records so Admin can decide what to teach, verify and source next.</p></div></div>
            </section>

            <section className="panel learn-access-control-v197">
              <div className="learn-access-admin-head">
                <div><span className="eyebrow">V19.7 · LEARNING ACCESS PLANS</span><h3>Plan catalog → verified activation → course entitlements.</h3><p>Build learning bundles without manufacturing payment truth. Paid plan requests stay locked until verified payment or an authorized admin/sponsored grant activates them.</p></div>
                <button className="secondary" onClick={loadLearnAccessControl} disabled={learnAccessBusy}>{learnAccessBusy?'Refreshing…':'↻ Refresh access'}</button>
              </div>

              <div className="learn-access-admin-kpis">
                <article><small>Plans</small><b>{learnAccessControl.plans.length}</b><span>All learning plans</span></article>
                <article><small>Published</small><b>{learnAccessControl.plans.filter(x=>x.status==='PUBLISHED').length}</b><span>Learner-visible</span></article>
                <article><small>Active access</small><b>{learnAccessControl.subscriptions.filter(x=>x.status==='ACTIVE').length}</b><span>Entitlement-backed</span></article>
                <article><small>Needs action</small><b>{learnAccessControl.subscriptions.filter(x=>['PENDING','PAYMENT_REQUIRED'].includes(x.status)).length}</b><span>Pending activation</span></article>
              </div>

              <details className="learn-access-plan-create">
                <summary>＋ Create learning access plan</summary>
                <div className="learn-access-plan-form">
                  <label>Name<input value={learnAccessForm.name} onChange={e=>setLearnAccessForm({...learnAccessForm,name:e.target.value})} placeholder="HOWDI Skill Builder"/></label>
                  <label>Price<input type="number" min="0" value={learnAccessForm.price} onChange={e=>setLearnAccessForm({...learnAccessForm,price:e.target.value})}/></label>
                  <label>Billing<select value={learnAccessForm.billing_cycle} onChange={e=>setLearnAccessForm({...learnAccessForm,billing_cycle:e.target.value})}><option>MONTHLY</option><option>QUARTERLY</option><option>YEARLY</option><option>ONE_TIME</option></select></label>
                  <label>Access days<input type="number" min="1" value={learnAccessForm.access_days} onChange={e=>setLearnAccessForm({...learnAccessForm,access_days:e.target.value})} placeholder="Blank = no fixed end"/></label>
                  <label className="wide">Description<textarea value={learnAccessForm.description} onChange={e=>setLearnAccessForm({...learnAccessForm,description:e.target.value})}/></label>
                  <label className="wide">Benefits<textarea value={learnAccessForm.benefits} onChange={e=>setLearnAccessForm({...learnAccessForm,benefits:e.target.value})} placeholder={"One benefit per line\nCourse access\nPractice workspace\nSkill Passport support"}/></label>
                  <div className="wide learn-access-course-pick"><b>Included courses</b><div>{(learnCourses||[]).map(c=><label key={c.id}><input type="checkbox" checked={learnAccessCourseIds.includes(c.id)} onChange={e=>setLearnAccessCourseIds(prev=>e.target.checked?[...prev,c.id]:prev.filter(id=>id!==c.id))}/><span>{c.title}</span></label>)}</div></div>
                </div>
                <div className="learn-access-create-foot"><span>Plans start as <b>DRAFT</b>.</span><button onClick={createLearnAccessPlan} disabled={learnAccessBusy}>{learnAccessBusy?'Saving…':'Save Draft Plan'}</button></div>
              </details>

              <div className="learn-access-plan-list">
                {(learnAccessControl.plans||[]).map(plan=><article key={plan.id}>
                  <div><em className={String(plan.status).toLowerCase()}>{plan.status}</em><small>{plan.plan_code}</small><h4>{plan.name}</h4><p>{learnMoney(plan.price||0)} · {plan.billing_cycle} · {plan.course_count||0} courses</p></div>
                  <div className="learn-access-plan-stats"><b>{plan.active_count||0}</b><small>active</small><span>{plan.pending_count||0} pending</span></div>
                  <div className="learn-access-plan-actions">
                    <button onClick={()=>{setLearnAccessSelectedPlan(plan);setLearnAccessCourseIds([])}}>Edit Courses</button>
                    {plan.status==='DRAFT'&&<button className="publish" onClick={()=>updateLearnAccessPlanStatus(plan,'PUBLISHED')}>Publish</button>}
                    {plan.status==='PUBLISHED'&&<button onClick={()=>updateLearnAccessPlanStatus(plan,'ARCHIVED')}>Archive</button>}
                  </div>
                </article>)}
                {!learnAccessControl.plans.length&&<div className="learn-empty">No learning access plans yet.</div>}
              </div>

              {learnAccessSelectedPlan&&<div className="learn-access-course-editor">
                <div><span className="eyebrow">PLAN COURSE ACCESS</span><h4>{learnAccessSelectedPlan.name}</h4><p>Select the courses this plan should unlock after activation.</p></div>
                <div className="learn-access-course-editor-grid">{(learnCourses||[]).map(c=><label key={c.id}><input type="checkbox" checked={learnAccessCourseIds.includes(c.id)} onChange={e=>setLearnAccessCourseIds(prev=>e.target.checked?[...prev,c.id]:prev.filter(id=>id!==c.id))}/><span>{c.title}</span></label>)}</div>
                <div className="learn-access-course-editor-actions"><button className="secondary" onClick={()=>setLearnAccessSelectedPlan(null)}>Cancel</button><button onClick={()=>saveLearnAccessPlanCourses(learnAccessSelectedPlan)} disabled={learnAccessBusy}>Save Course Access</button></div>
              </div>}

              <div className="learn-access-subscription-section">
                <div><span className="eyebrow">LEARNER ACCESS REQUESTS</span><h4>Payment truth stays separate from entitlement activation.</h4></div>
                <div className="learn-access-activation-controls"><select value={learnAccessActivation.source} onChange={e=>setLearnAccessActivation({...learnAccessActivation,source:e.target.value})}><option value="ADMIN_GRANT">Admin Grant</option><option value="SPONSORED">Sponsored</option><option value="VERIFIED_PAYMENT">Verified Payment</option></select><input value={learnAccessActivation.payment_reference} onChange={e=>setLearnAccessActivation({...learnAccessActivation,payment_reference:e.target.value})} placeholder="Payment reference only when verified"/></div>
                <div className="learn-access-sub-list">{(learnAccessControl.subscriptions||[]).map(sub=><article key={sub.id}>
                  <div><b>{sub.full_name||'HOWDI Learner'}</b><small>{sub.howdi_id||sub.email||'—'}</small></div>
                  <div><b>{sub.plan_name}</b><small>{learnMoney(sub.price||0)} · {sub.billing_cycle}</small></div>
                  <em className={String(sub.status).toLowerCase()}>{sub.status.replaceAll('_',' ')}</em>
                  <div className="learn-access-sub-actions">{['PENDING','PAYMENT_REQUIRED'].includes(sub.status)&&<button onClick={()=>activateLearnAccessSubscription(sub)} disabled={learnAccessBusy}>Activate</button>}{sub.status==='ACTIVE'&&<button className="cancel" onClick={()=>cancelLearnAccessSubscription(sub)} disabled={learnAccessBusy}>Cancel</button>}</div>
                </article>)}</div>
              </div>

              <div className="learn-access-admin-policy"><span>🛡️</span><div><b>No fake paid access.</b><p>Paid requests do not unlock courses. Activation must be based on verified payment, admin grant or sponsored access. Course entitlements created by an individual purchase are preserved even if a learning plan is cancelled.</p></div></div>
            </section>

            <section className="panel learn-opportunity-control-v196">
              <div className="learn-opportunity-head">
                <div><span className="eyebrow">V19.6 · OPPORTUNITY BRIDGE</span><h3>Verified proof → relevant opportunities → governed next step.</h3><p>Create opportunities, publish them to learners, review expressed interest and move people through a transparent status flow. HOWDI never promises selection, employment or income.</p></div>
                <button className="secondary" onClick={loadLearnOpportunityControl} disabled={learnOpportunityBusy}>{learnOpportunityBusy?'Refreshing…':'↻ Refresh opportunities'}</button>
              </div>

              <div className="learn-opportunity-kpis">
                <article><small>Published</small><b>{Number(learnOpportunityControl.summary?.published||0)}</b><span>Visible to learners</span></article>
                <article><small>Drafts</small><b>{Number(learnOpportunityControl.summary?.drafts||0)}</b><span>Not learner-visible</span></article>
                <article><small>Interests</small><b>{Number(learnOpportunityControl.summary?.interests||0)}</b><span>All learner signals</span></article>
                <article><small>Shortlisted</small><b>{Number(learnOpportunityControl.summary?.shortlisted||0)}</b><span>Admin-reviewed</span></article>
                <article><small>Total</small><b>{Number(learnOpportunityControl.summary?.total||0)}</b><span>Opportunity records</span></article>
              </div>

              <details className="learn-opportunity-create">
                <summary>＋ Create governed opportunity</summary>
                <div className="learn-opportunity-form-grid">
                  <label>Title<input value={learnOpportunityForm.title} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,title:e.target.value})} placeholder="e.g. Crochet product photography project"/></label>
                  <label>Organization<input value={learnOpportunityForm.organization_name} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,organization_name:e.target.value})}/></label>
                  <label>Type<select value={learnOpportunityForm.opportunity_type} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,opportunity_type:e.target.value})}><option>PROJECT</option><option>GIG</option><option>INTERNSHIP</option><option>APPRENTICESHIP</option><option>CREATOR_TASK</option><option>COMMUNITY_WORK</option><option>OTHER</option></select></label>
                  <label>Location mode<select value={learnOpportunityForm.location_mode} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,location_mode:e.target.value})}><option>FLEXIBLE</option><option>REMOTE</option><option>ONSITE</option><option>HYBRID</option></select></label>
                  <label>Location label<input value={learnOpportunityForm.location_label} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,location_label:e.target.value})} placeholder="Bengaluru / Remote / India"/></label>
                  <label>Required course<select value={learnOpportunityForm.required_course_id} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,required_course_id:e.target.value})}><option value="">No fixed course</option>{(learnCourses||[]).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
                  <label>Skill terms<input value={learnOpportunityForm.required_skill_terms} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,required_skill_terms:e.target.value})} placeholder="crochet, finishing, product photography"/></label>
                  <label>Min verified proof<input type="number" min="0" value={learnOpportunityForm.min_verified_evidence} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,min_verified_evidence:e.target.value})}/></label>
                  <label>Min projects<input type="number" min="0" value={learnOpportunityForm.min_verified_projects} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,min_verified_projects:e.target.value})}/></label>
                  <label>Min readiness %<input type="number" min="0" max="100" value={learnOpportunityForm.min_readiness} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,min_readiness:e.target.value})}/></label>
                  <label>Slots<input type="number" min="1" value={learnOpportunityForm.slots} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,slots:e.target.value})} placeholder="Optional"/></label>
                  <label>Close date<input type="datetime-local" value={learnOpportunityForm.closes_at} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,closes_at:e.target.value})}/></label>
                  <label className="wide">Description<textarea value={learnOpportunityForm.description} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,description:e.target.value})} placeholder="What is the opportunity and what will the person actually do?"/></label>
                  <label className="wide">Compensation note<input value={learnOpportunityForm.compensation_note} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,compensation_note:e.target.value})} placeholder="Optional. Example: Fixed project fee after scope confirmation"/></label>
                  <label className="wide">Before expressing interest<textarea value={learnOpportunityForm.application_note} onChange={e=>setLearnOpportunityForm({...learnOpportunityForm,application_note:e.target.value})} placeholder="Important conditions, availability or partner review notes"/></label>
                </div>
                <div className="learn-opportunity-create-foot"><span>New opportunities always start as <b>DRAFT</b>.</span><button onClick={createLearnOpportunity} disabled={learnOpportunityBusy}>{learnOpportunityBusy?'Saving…':'Save Draft Opportunity'}</button></div>
              </details>

              <div className="learn-opportunity-toolbar">
                {["ALL","PUBLISHED","DRAFT","CLOSED"].map(status=><button key={status} className={learnOpportunityFilter===status?'active':''} onClick={()=>setLearnOpportunityFilter(status)}>{status.replaceAll("_"," ")}</button>)}
              </div>

              <div className="learn-opportunity-admin-list">
                {(learnOpportunityControl.opportunities||[]).filter(o=>learnOpportunityFilter==='ALL'||o.status===learnOpportunityFilter).map(op=><article key={op.id}>
                  <div className="learn-opportunity-admin-main">
                    <div className="learn-opportunity-admin-title"><em className={String(op.status).toLowerCase()}>{op.status}</em><small>{op.opportunity_code} · {op.opportunity_type} · {op.location_mode}</small></div>
                    <h4>{op.title}</h4><p>{op.organization_name}{op.location_label?` · ${op.location_label}`:''}</p>
                    <div className="learn-opportunity-admin-rules"><span>Proof ≥ {op.min_verified_evidence||0}</span><span>Projects ≥ {op.min_verified_projects||0}</span><span>Readiness ≥ {op.min_readiness||0}%</span>{op.required_course_title&&<span>Course: {op.required_course_title}</span>}</div>
                  </div>
                  <div className="learn-opportunity-admin-stats"><b>{Number(op.interest_count||0)}</b><small>interests</small><span>{Number(op.shortlisted_count||0)} shortlisted</span></div>
                  <div className="learn-opportunity-admin-actions">
                    <button onClick={()=>openLearnOpportunityInterests(op)}>View Interests</button>
                    {op.status==='DRAFT'&&<button className="publish" onClick={()=>updateLearnOpportunityStatus(op,'PUBLISHED')}>Publish</button>}
                    {op.status==='PUBLISHED'&&<button className="close-op" onClick={()=>updateLearnOpportunityStatus(op,'CLOSED')}>Close</button>}
                    {op.status==='CLOSED'&&<button onClick={()=>updateLearnOpportunityStatus(op,'PUBLISHED')}>Reopen</button>}
                  </div>
                </article>)}
                {!learnOpportunityBusy&&!(learnOpportunityControl.opportunities||[]).filter(o=>learnOpportunityFilter==='ALL'||o.status===learnOpportunityFilter).length&&<div className="learn-empty">No opportunities in this view.</div>}
              </div>

              {learnOpportunitySelected&&<div className="learn-opportunity-interest-drawer">
                <div className="learn-opportunity-interest-head"><div><span className="eyebrow">LEARNER INTEREST CONTROL</span><h4>{learnOpportunitySelected.title}</h4><p>Review the learner’s captured Skill Passport snapshot. Status changes are operational decisions, not promises of employment or income.</p></div><button onClick={()=>{setLearnOpportunitySelected(null);setLearnOpportunityInterests([])}}>×</button></div>
                <div className="learn-opportunity-interest-list">
                  {(learnOpportunityInterests||[]).map(item=><article key={item.id}>
                    <div className="learn-opportunity-learner"><span>{String(item.full_name||'L').slice(0,1).toUpperCase()}</span><div><b>{item.full_name||'HOWDI Learner'}</b><small>{item.howdi_id||item.email||'—'}</small></div></div>
                    <div className="learn-opportunity-snapshot"><span>Readiness <b>{item.passport_snapshot?.readiness||0}%</b></span><span>Proof <b>{item.passport_snapshot?.verified_evidence||0}</b></span><span>Projects <b>{item.passport_snapshot?.verified_projects||0}</b></span></div>
                    <div className="learn-opportunity-learner-note"><small>LEARNER NOTE</small><p>{item.learner_note||'No note added.'}</p></div>
                    <div className="learn-opportunity-interest-actions"><em className={String(item.status).toLowerCase()}>{item.status}</em>{item.status==='INTERESTED'&&<><button onClick={()=>updateLearnOpportunityInterestStatus(item,'SHORTLISTED')}>Shortlist</button><button className="decline" onClick={()=>updateLearnOpportunityInterestStatus(item,'DECLINED')}>Decline</button></>}{item.status==='SHORTLISTED'&&<><button onClick={()=>updateLearnOpportunityInterestStatus(item,'SELECTED')}>Mark Selected</button><button className="decline" onClick={()=>updateLearnOpportunityInterestStatus(item,'DECLINED')}>Decline</button></>}{item.status==='SELECTED'&&<button onClick={()=>updateLearnOpportunityInterestStatus(item,'COMPLETED')}>Mark Completed</button>}</div>
                  </article>)}
                  {!learnOpportunityBusy&&!learnOpportunityInterests.length&&<div className="learn-empty">No learners have expressed interest yet.</div>}
                </div>
              </div>}

              <div className="learn-opportunity-admin-policy"><span>🛡️</span><div><b>No automatic job promises.</b><p>Skill Passport proof can rank relevance, but HOWDI still requires human/partner review. Publishing an opportunity or marking a learner Selected must never be presented as guaranteed employment or income.</p></div></div>
            </section>

            <section className="panel learn-ai-review-control">
              <div className="learn-ai-review-head">
                <div>
                  <span className="eyebrow">V19.5D · AI STUDIO REVIEW CONTROL</span>
                  <h3>Human review before learner use.</h3>
                  <p>Inspect the exact submitted version, teacher/course context and AI provenance before approving instructional content.</p>
                </div>
                <button className="secondary" onClick={loadLearnAiReview} disabled={learnAiReviewBusy}>{learnAiReviewBusy?'Refreshing…':'↻ Refresh AI review'}</button>
              </div>

              <div className="learn-ai-review-kpis">
                <article className={Number(learnAiReview.summary?.in_review||0)>0?'attention':''}><small>Waiting review</small><b>{Number(learnAiReview.summary?.in_review||0)}</b><span>Human decision required</span></article>
                <article><small>Approved</small><b>{Number(learnAiReview.summary?.approved||0)}</b><span>Human-reviewed versions</span></article>
                <article><small>Changes required</small><b>{Number(learnAiReview.summary?.changes_required||0)}</b><span>Returned to teachers</span></article>
                <article><small>AI-assisted</small><b>{Number(learnAiReview.summary?.ai_assisted||0)}</b><span>Provider-assisted drafts</span></article>
                <article><small>Total assets</small><b>{Number(learnAiReview.summary?.total||0)}</b><span>All governed content</span></article>
              </div>

              <div className="learn-ai-review-tools">
                <div className="learn-ai-review-search"><span>⌕</span><input value={learnAiReviewSearch} onChange={e=>setLearnAiReviewSearch(e.target.value)} placeholder="Search title, teacher, HOWDI ID, course or model…"/></div>
                <select value={learnAiReviewFilter} onChange={e=>setLearnAiReviewFilter(e.target.value)}>
                  <option value="IN_REVIEW">Waiting review</option>
                  <option value="ALL">All AI Studio content</option>
                  <option value="DRAFT">Draft</option>
                  <option value="APPROVED">Approved</option>
                  <option value="CHANGES_REQUIRED">Changes required</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="learn-ai-review-table">
                <div className="learn-ai-review-table-head">
                  <span>Content</span><span>Teacher</span><span>Course</span><span>Version</span><span>Origin</span><span>Status</span><span></span>
                </div>
                {filteredLearnAiAssets.slice(0,150).map(item=><article key={item.id} className={item.status==='IN_REVIEW'?'needs-review':''}>
                  <div className="learn-ai-content">
                    <span>{item.asset_type==='QUIZ_DRAFT'?'❓':item.asset_type==='TRANSLATION_DRAFT'?'🌐':item.asset_type==='PRACTICE_PROMPT'?'✋':'✨'}</span>
                    <div><b>{item.title}</b><small>{learnAiTypeLabel(item.asset_type)} · {item.language||'English'}</small></div>
                  </div>
                  <div><b>{item.teacher_name||'HOWDI Teacher'}</b><small>{item.howdi_id||item.teacher_email||'—'}</small></div>
                  <div><b>{item.course_title||'General'}</b><small>{item.course_id?'Course linked':'No course link'}</small></div>
                  <div><b>v{item.current_version||1}</b><small>{item.version_created_at?learnCommerceDate(item.version_created_at):'Current version'}</small></div>
                  <div><em className={`learn-ai-origin ${item.generation_mode==='AI_ASSISTED_DRAFT'?'ai':'manual'}`}>{item.generation_mode==='AI_ASSISTED_DRAFT'?'AI-assisted':'Teacher draft'}</em><small>{item.model_reference||'No model reference'}</small></div>
                  <div><em className={`learn-ai-status ${learnAiStatusClass(item.status)}`}>{learnAiStatusLabel(item.status)}</em></div>
                  <div className="learn-ai-row-actions"><button onClick={()=>openLearnAiAsset(item)}>{item.status==='IN_REVIEW'?'Review':'Inspect'}</button></div>
                </article>)}
                {!learnAiReviewBusy&&!filteredLearnAiAssets.length&&<div className="learn-empty">No AI Studio assets match this review view.</div>}
              </div>

              <div className="learn-ai-review-rule">
                <span>🛡️</span><div><b>AI never approves AI.</b><p>Generation may help a teacher draft faster, but a human reviewer controls approval. This review decision applies to the exact submitted version and does not auto-publish content to learners.</p></div>
              </div>

              {selectedLearnAiAsset&&<div className="learn-ai-review-inspector">
                <div className="learn-ai-inspector-head">
                  <div><span className="eyebrow">AI CONTENT INSPECTOR</span><h4>{selectedLearnAiAsset.title}</h4><p>{selectedLearnAiAsset.teacher_name||'HOWDI Teacher'} · {selectedLearnAiAsset.howdi_id||selectedLearnAiAsset.teacher_email||'—'} · {selectedLearnAiAsset.course_title||'General content'}</p></div>
                  <button onClick={()=>{setSelectedLearnAiAsset(null);setLearnAiAssetDetail(null)}}>×</button>
                </div>

                {!learnAiAssetDetail&&<div className="learn-empty">Loading governed version history…</div>}

                {learnAiAssetDetail&&<>
                  <div className="learn-ai-inspector-meta">
                    <article><small>Status</small><b>{learnAiStatusLabel(learnAiAssetDetail.asset?.status)}</b><span>Current workflow state</span></article>
                    <article><small>Submitted version</small><b>v{learnAiAssetDetail.asset?.current_version||1}</b><span>{learnAiAssetDetail.versions?.[0]?.generation_mode==='AI_ASSISTED_DRAFT'?'AI-assisted':'Teacher draft'}</span></article>
                    <article><small>Teacher</small><b>{learnAiAssetDetail.asset?.teacher_name||'—'}</b><span>{learnAiAssetDetail.asset?.howdi_id||learnAiAssetDetail.asset?.teacher_email||'—'}</span></article>
                    <article><small>Course</small><b>{learnAiAssetDetail.asset?.course_title||'General'}</b><span>{learnAiAssetDetail.asset?.course_level||'No level'}</span></article>
                  </div>

                  <div className="learn-ai-inspector-columns">
                    <section className="learn-ai-content-preview">
                      <div className="learn-ai-section-title"><div><span>SUBMITTED CONTENT</span><h4>Version {learnAiAssetDetail.asset?.current_version||1}</h4></div><em>{learnAiTypeLabel(learnAiAssetDetail.asset?.asset_type)}</em></div>
                      <pre>{learnAiAssetDetail.versions?.find(v=>Number(v.version_number)===Number(learnAiAssetDetail.asset?.current_version))?.content_text||'No content available.'}</pre>
                      {learnAiAssetDetail.versions?.find(v=>Number(v.version_number)===Number(learnAiAssetDetail.asset?.current_version))?.prompt_snapshot&&<details><summary>Generation prompt snapshot</summary><pre>{learnAiAssetDetail.versions.find(v=>Number(v.version_number)===Number(learnAiAssetDetail.asset?.current_version)).prompt_snapshot}</pre></details>}
                    </section>

                    <aside className="learn-ai-version-history">
                      <div className="learn-ai-section-title"><div><span>VERSION HISTORY</span><h4>{learnAiAssetDetail.versions?.length||0} versions</h4></div></div>
                      <div>{(learnAiAssetDetail.versions||[]).map(v=><article key={v.id} className={Number(v.version_number)===Number(learnAiAssetDetail.asset?.current_version)?'current':''}><div><b>Version {v.version_number}</b><small>{v.generation_mode==='AI_ASSISTED_DRAFT'?'AI-assisted':'Teacher draft'} · {v.created_by}</small></div><time>{learnCommerceDate(v.created_at)}</time></article>)}</div>
                    </aside>
                  </div>

                  <div className="learn-ai-review-history">
                    <div className="learn-ai-section-title"><div><span>REVIEW & AUDIT HISTORY</span><h4>Human decisions and workflow events</h4></div></div>
                    <div className="learn-ai-history-grid">
                      <section>
                        <b>Reviews</b>
                        {(learnAiAssetDetail.reviews||[]).map(r=><article key={r.id}><span className={`learn-ai-status ${learnAiStatusClass(r.decision)}`}>{learnAiStatusLabel(r.decision)}</span><div><b>{r.reviewer}</b><small>{r.feedback||'No reviewer feedback'}</small><time>v{r.version_number} · {learnCommerceDate(r.created_at)}</time></div></article>)}
                        {!(learnAiAssetDetail.reviews||[]).length&&<div className="learn-empty">No review events yet.</div>}
                      </section>
                      <section>
                        <b>Workflow events</b>
                        {(learnAiAssetDetail.events||[]).map(e=><article key={e.id}><span>•</span><div><b>{String(e.event_type||'EVENT').replaceAll('_',' ')}</b><small>{e.actor||'HOWDI'}</small><time>{learnCommerceDate(e.created_at)}</time></div></article>)}
                        {!(learnAiAssetDetail.events||[]).length&&<div className="learn-empty">No audit events yet.</div>}
                      </section>
                    </div>
                  </div>

                  {(learnAiAssetDetail.asset?.status==='APPROVED'||(learnAiAssetDetail.reviews||[]).some(r=>r.decision==='APPROVED'&&Number(r.version_number)===Number(learnAiAssetDetail.asset?.current_version)))&&<section className="learn-ai-course-bridge">
                    <div className="learn-ai-course-bridge-head">
                      <div><span className="eyebrow">V19.5E · COURSE STUDIO BRIDGE</span><h4>Send approved content into the course — safely.</h4><p>The approved version is copied into an inactive lesson first. A separate activation step controls learner visibility.</p></div>
                      {!learnAiBridgeCourse&&<button onClick={prepareLearnAiCourseBridge} disabled={learnAiBridgeBusy||!learnAiAssetDetail.asset?.course_id}>{learnAiBridgeBusy?'Loading…':'Prepare Course Import →'}</button>}
                    </div>
                    {!learnAiAssetDetail.asset?.course_id&&<div className="learn-ai-bridge-warning">This asset has no linked course. A course link is required before import.</div>}
                    {learnAiBridgeCourse&&<div className="learn-ai-bridge-form">
                      <label>Target course<input value={learnAiBridgeCourse.course?.title||''} disabled/></label>
                      <label>Target module<select value={learnAiBridgeForm.module_id} onChange={e=>setLearnAiBridgeForm({...learnAiBridgeForm,module_id:e.target.value})}>{(learnAiBridgeCourse.modules||[]).map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
                      <label>Lesson title<input value={learnAiBridgeForm.title} onChange={e=>setLearnAiBridgeForm({...learnAiBridgeForm,title:e.target.value})}/></label>
                      <label>Lesson type<select value={learnAiBridgeForm.lesson_type} onChange={e=>setLearnAiBridgeForm({...learnAiBridgeForm,lesson_type:e.target.value})}><option>TEXT</option><option>VIDEO</option><option>QUIZ</option><option>PRACTICE</option><option>LIVE</option></select></label>
                      <label>Minutes<input type="number" min="0" value={learnAiBridgeForm.duration_minutes} onChange={e=>setLearnAiBridgeForm({...learnAiBridgeForm,duration_minutes:e.target.value})} placeholder="0"/></label>
                      <div className="learn-ai-bridge-actions"><button className="secondary" onClick={()=>setLearnAiBridgeCourse(null)}>Cancel</button><button onClick={stageLearnAiToCourse} disabled={learnAiBridgeBusy||!learnAiBridgeForm.module_id}>{learnAiBridgeBusy?'Staging…':'Stage as Inactive Lesson →'}</button></div>
                    </div>}
                    {!!(learnAiAssetDetail.connections||[]).length&&<div className="learn-ai-bridge-history">
                      <b>Course Studio connections</b>
                      {(learnAiAssetDetail.connections||[]).map(x=><article key={x.id}><div><span>{x.status==='ACTIVE'?'✓':'✨'}</span><div><b>{x.lesson_title}</b><small>{x.module_title} · source v{x.version_number}</small></div></div><div><em className={String(x.status||'STAGED').toLowerCase()}>{x.status}</em>{x.status==='STAGED'&&!x.lesson_active&&<button onClick={()=>activateLearnAiLesson(x.lesson_id,learnAiAssetDetail.asset?.course_publish_status)} disabled={learnAiBridgeBusy}>Activate</button>}</div></article>)}
                    </div>}
                  </section>}

                  {learnAiAssetDetail.asset?.status==='IN_REVIEW'&&<div className="learn-ai-decision-panel">
                    <div><span className="eyebrow">HUMAN REVIEW DECISION</span><h4>Decide this exact version.</h4><p>Approval confirms human review. Changes Required and Reject require written feedback for the teacher.</p></div>
                    <div className="learn-ai-decision-options">
                      {[
                        ['APPROVED','✓ Approve'],
                        ['CHANGES_REQUIRED','↺ Changes Required'],
                        ['REJECTED','✕ Reject']
                      ].map(([value,label])=><button key={value} className={`${learnAiDecision===value?'active ':''}${learnAiStatusClass(value)}`} onClick={()=>setLearnAiDecision(value)}>{label}</button>)}
                    </div>
                    <textarea value={learnAiFeedback} onChange={e=>setLearnAiFeedback(e.target.value)} placeholder={learnAiDecision==='APPROVED'?'Optional reviewer note…':'Required: explain what the teacher must change or why this content is rejected…'} />
                    <div className="learn-ai-decision-foot"><span>🔒 No learner publishing occurs from this decision alone.</span><button onClick={submitLearnAiReview} disabled={learnAiReviewBusy}>{learnAiReviewBusy?'Saving decision…':learnAiDecision==='APPROVED'?'Approve Version →':learnAiDecision==='CHANGES_REQUIRED'?'Return to Teacher →':'Reject Version →'}</button></div>
                  </div>}

                  {learnAiAssetDetail.asset?.status!=='IN_REVIEW'&&<div className="learn-ai-closed-decision"><span>✓</span><div><b>Review is currently closed.</b><p>Status: {learnAiStatusLabel(learnAiAssetDetail.asset?.status)}. A teacher must submit a new or changed draft before another human decision can be made.</p></div></div>}
                </>}
              </div>}
            </section>

            <section className="panel learn-commerce-control">
              <div className="learn-commerce-head">
                <div>
                  <span className="eyebrow">LEARNING COMMERCE CONTROL</span>
                  <h3>Purchase → Payment → Entitlement → My Learning</h3>
                  <p>One operational view of every course purchase and whether learner access matches the payment truth.</p>
                </div>
                <button className="secondary" onClick={loadLearnCommerce} disabled={learnCommerceBusy}>{learnCommerceBusy?'Refreshing…':'↻ Refresh commerce'}</button>
              </div>

              <div className="learn-commerce-kpis">
                <article><small>Total purchases</small><b>{Number(learnCommerce.summary?.total_purchases||0)}</b><span>All course checkouts</span></article>
                <article><small>Paid</small><b>{Number(learnCommerce.summary?.paid_purchases||0)}</b><span>{learnMoney(learnCommerce.summary?.paid_value||0)} collected state</span></article>
                <article><small>Pending</small><b>{Number(learnCommerce.summary?.pending_purchases||0)}</b><span>{learnMoney(learnCommerce.summary?.pending_value||0)} awaiting payment</span></article>
                <article className={Number(learnCommerce.summary?.attention_required||0)>0?'attention':''}><small>Needs attention</small><b>{Number(learnCommerce.summary?.attention_required||0)}</b><span>Access / ledger mismatches</span></article>
              </div>

              <div className="learn-commerce-tools">
                <div className="learn-commerce-search"><span>⌕</span><input value={learnCommerceSearch} onChange={e=>setLearnCommerceSearch(e.target.value)} placeholder="Search learner, HOWDI ID, course or purchase code…"/></div>
                <select value={learnCommerceFilter} onChange={e=>setLearnCommerceFilter(e.target.value)}>
                  <option value="ALL">All purchases</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending payment</option>
                  <option value="FAILED">Failed payment</option>
                  <option value="REFUNDED">Refunded</option>
                  <option value="ENTITLEMENT_MISSING">Entitlement missing</option>
                  <option value="ENROLLMENT_MISSING">My Learning missing</option>
                  <option value="PAYMENT_LEDGER_MISMATCH">Ledger mismatch</option>
                </select>
              </div>

              <div className="learn-commerce-table">
                <div className="learn-commerce-table-head">
                  <span>Learner / Course</span><span>Purchase</span><span>Payment</span><span>Access</span><span>Integrity</span><span></span>
                </div>
                {filteredLearnPurchases.slice(0,100).map(item=><article key={item.id} className={item.integrity_state!=='OK'?'needs-attention':''}>
                  <div className="learn-commerce-person">
                    <span>{(item.learner_name||'L').slice(0,1).toUpperCase()}</span>
                    <div><b>{item.learner_name||'HOWDI Learner'}</b><small>{item.howdi_id||item.email||`User #${item.user_id}`}</small><em>{item.course_title}</em></div>
                  </div>
                  <div><b>{learnMoney(item.payable_amount,item.currency||'INR')}</b><small>{item.purchase_code}</small><small>{learnCommerceDate(item.created_at)}</small></div>
                  <div><em className={`learn-pay-status ${String(item.payment_status||'PENDING').toLowerCase()}`}>{item.payment_status||'PENDING'}</em><small>{item.transaction_code||item.payment_method||'No transaction yet'}</small></div>
                  <div><b>{item.entitlement_status||'NO ENTITLEMENT'}</b><small>{item.enrollment_id?`My Learning · ${Number(item.enrollment_progress||0)}%`:'Not in My Learning'}</small></div>
                  <div><em className={`learn-integrity ${String(item.integrity_state||'OK').toLowerCase()}`}>{learnIntegrityLabel(item.integrity_state)}</em></div>
                  <div className="learn-commerce-row-actions">
                    <button className="secondary" onClick={()=>setSelectedLearnPurchase(item)}>Inspect</button>
                    {['ENTITLEMENT_MISSING','ENROLLMENT_MISSING'].includes(item.integrity_state)&&item.payment_status==='PAID'&&item.purchase_status==='ACTIVE'&&
                      <button onClick={()=>reconcileLearnEntitlement(item)} disabled={learnCommerceBusy}>Repair access</button>}
                  </div>
                </article>)}
                {!learnCommerceBusy&&!filteredLearnPurchases.length&&<div className="learn-empty">No learning purchases match this view yet.</div>}
                {learnCommerceBusy&&!(learnCommerce.purchases||[]).length&&<div className="learn-empty">Loading learning commerce…</div>}
              </div>

              <div className="learn-commerce-rule">
                <span>🛡️</span>
                <div><b>Governance rule</b><p>This screen does not manufacture a successful payment. “Repair access” is allowed only when the stored purchase is already <strong>PAID + ACTIVE</strong>; it restores entitlement / My Learning consistency and writes an audit event.</p></div>
              </div>

              {selectedLearnPurchase&&<div className="learn-purchase-inspector">
                <div className="learn-purchase-inspector-head">
                  <div><span className="eyebrow">PURCHASE INSPECTOR</span><h4>{selectedLearnPurchase.course_title}</h4><p>{selectedLearnPurchase.learner_name} · {selectedLearnPurchase.howdi_id||selectedLearnPurchase.email}</p></div>
                  <button onClick={()=>setSelectedLearnPurchase(null)}>×</button>
                </div>
                <div className="learn-purchase-inspector-grid">
                  <article><small>Purchase</small><b>{selectedLearnPurchase.purchase_code}</b><span>{selectedLearnPurchase.purchase_status}</span></article>
                  <article><small>Payment</small><b>{selectedLearnPurchase.payment_status}</b><span>{selectedLearnPurchase.transaction_code||'No ledger transaction'}</span></article>
                  <article><small>Entitlement</small><b>{selectedLearnPurchase.entitlement_status||'Missing'}</b><span>{selectedLearnPurchase.entitlement_ends_at?`Ends ${learnCommerceDate(selectedLearnPurchase.entitlement_ends_at)}`:'No fixed expiry'}</span></article>
                  <article><small>My Learning</small><b>{selectedLearnPurchase.enrollment_id?'Connected':'Missing'}</b><span>{selectedLearnPurchase.enrollment_id?`${Number(selectedLearnPurchase.enrollment_progress||0)}% progress`:'No enrollment record'}</span></article>
                </div>
                <div className="learn-purchase-timeline">
                  <span><b>Checkout created</b><small>{learnCommerceDate(selectedLearnPurchase.created_at)}</small></span>
                  <i></i>
                  <span className={selectedLearnPurchase.payment_status==='PAID'?'done':''}><b>Payment {selectedLearnPurchase.payment_status||'PENDING'}</b><small>{learnCommerceDate(selectedLearnPurchase.paid_at||selectedLearnPurchase.transaction_paid_at)}</small></span>
                  <i></i>
                  <span className={selectedLearnPurchase.entitlement_status==='ACTIVE'?'done':''}><b>Entitlement {selectedLearnPurchase.entitlement_status||'MISSING'}</b><small>{learnCommerceDate(selectedLearnPurchase.entitlement_starts_at)}</small></span>
                  <i></i>
                  <span className={selectedLearnPurchase.enrollment_id?'done':''}><b>My Learning</b><small>{selectedLearnPurchase.enrollment_id?'Connected':'Not connected'}</small></span>
                </div>
                <div className="learn-purchase-inspector-actions">
                  {['ENTITLEMENT_MISSING','ENROLLMENT_MISSING'].includes(selectedLearnPurchase.integrity_state)&&selectedLearnPurchase.payment_status==='PAID'&&selectedLearnPurchase.purchase_status==='ACTIVE'&&
                    <button onClick={()=>reconcileLearnEntitlement(selectedLearnPurchase)} disabled={learnCommerceBusy}>Repair learner access →</button>}
                  {selectedLearnPurchase.transaction_code&&<button className="secondary" onClick={()=>{setPaymentSearch(selectedLearnPurchase.transaction_code);setTab('payments')}}>Open Payment Control →</button>}
                </div>
              </div>}
            </section>

            <section className="learn-earn-principles">
              <article><span>🧶</span><b>Learn slowly</b><small>Simple lessons, close-up guidance and practice.</small></article>
              <article><span>💛</span><b>Grandma Tips</b><small>Warm human guidance inside every lesson.</small></article>
              <article><span>✋</span><b>Make something real</b><small>Projects prove the learner can create, not just watch.</small></article>
              <article><span>💰</span><b>Earn after skill</b><small>HPay reward rules remain separate and controlled.</small></article>
            </section>

            <section className="learn-earn-grid le-courses-workspace">
              <section className="panel learn-course-create">
                <div className="list-head"><div><span className="eyebrow">COURSE BUILDER</span><h3>Create a crochet learning journey</h3></div></div>
                <div className="learn-form-grid">
                  <label>Course title<input value={learnCourseForm.title} onChange={e=>setLearnCourseForm({...learnCourseForm,title:e.target.value})} placeholder="Crochet Foundations"/></label>
                  <label>Level<select value={learnCourseForm.level} onChange={e=>setLearnCourseForm({...learnCourseForm,level:e.target.value})}><option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option></select></label>
                  <label className="wide">Tagline<input value={learnCourseForm.tagline} onChange={e=>setLearnCourseForm({...learnCourseForm,tagline:e.target.value})}/></label>
                  <label>Language<input value={learnCourseForm.language} onChange={e=>setLearnCourseForm({...learnCourseForm,language:e.target.value})}/></label>
                  <label>Duration (minutes)<input type="number" value={learnCourseForm.duration_minutes} onChange={e=>setLearnCourseForm({...learnCourseForm,duration_minutes:e.target.value})}/></label>
                  <label className="wide">Description<textarea value={learnCourseForm.description} onChange={e=>setLearnCourseForm({...learnCourseForm,description:e.target.value})} placeholder="What will Grandma guide the learner through?"/></label>
                  <label>Learning outcomes<textarea value={learnCourseForm.outcomes} onChange={e=>setLearnCourseForm({...learnCourseForm,outcomes:e.target.value})} placeholder={"One outcome per line\nHold hook and yarn correctly\nMake a granny square"}/></label>
                  <label>Materials needed<textarea value={learnCourseForm.materials} onChange={e=>setLearnCourseForm({...learnCourseForm,materials:e.target.value})} placeholder={"One item per line\n4 mm crochet hook\nCotton yarn"}/></label>
                </div>
                <div className="learn-commercial-create">
                  <div className="learn-commercial-head"><div><span className="eyebrow">COURSE ACCESS & PRICE</span><h4>Free or paid learning</h4></div><span>{learnCourseForm.purchase_mode}</span></div>
                  <div className="learn-commercial-grid">
                    <label>Access type<select value={learnCourseForm.purchase_mode} onChange={e=>setLearnCourseForm({...learnCourseForm,purchase_mode:e.target.value,price:e.target.value==='FREE'?'0':learnCourseForm.price})}><option value="FREE">FREE</option><option value="PAID">PAID</option></select></label>
                    <label>Currency<select value={learnCourseForm.currency} onChange={e=>setLearnCourseForm({...learnCourseForm,currency:e.target.value})}><option value="INR">INR ₹</option></select></label>
                    <label>Regular price<input type="number" min="0" step="1" disabled={learnCourseForm.purchase_mode==='FREE'} value={learnCourseForm.price} onChange={e=>setLearnCourseForm({...learnCourseForm,price:e.target.value})} placeholder="999"/></label>
                    <label>Sale price<input type="number" min="0" step="1" disabled={learnCourseForm.purchase_mode==='FREE'} value={learnCourseForm.sale_price} onChange={e=>setLearnCourseForm({...learnCourseForm,sale_price:e.target.value})} placeholder="799"/></label>
                    <label>Access days<input type="number" min="1" value={learnCourseForm.access_days} onChange={e=>setLearnCourseForm({...learnCourseForm,access_days:e.target.value})} placeholder="Blank = no fixed expiry"/></label>
                    <label className="learn-commercial-check"><input type="checkbox" checked={learnCourseForm.live_class_included} onChange={e=>setLearnCourseForm({...learnCourseForm,live_class_included:e.target.checked})}/> Live class included</label>
                    <label className="wide">Refund / cancellation policy<textarea value={learnCourseForm.refund_policy_text} onChange={e=>setLearnCourseForm({...learnCourseForm,refund_policy_text:e.target.value})} placeholder="Example: Refund requests are governed by HOWDI Learning policy and eligibility."/></label>
                  </div>
                  <p className="learn-commercial-note">Learners pay HOWDI. Course purchase creates learner entitlement; teacher earnings remain governed separately.</p>
                </div>
                <button onClick={createLearnCourse} disabled={learnCourseBusy}>Create draft course</button>
              </section>

              <section className="panel learn-course-library">
                <div className="list-head"><div><span className="eyebrow">COURSE LIBRARY</span><h3>{learnCourses.length} Learn & Earn courses</h3></div><button className="secondary" onClick={loadLearnEarnCourses}>{learnCourseBusy?'Loading…':'Refresh'}</button></div>
                <div className="learn-course-list">
                  {learnCourses.map(course=><button className={learnCourseStudio?.course?.id===course.id?'active':''} key={course.id} onClick={()=>openLearnCourseStudio(course.id)}>
                    <span><b>{course.title}</b><small>{course.level} · {course.language} · {course.module_count||0} modules · {course.lesson_count||0} lessons · {course.purchase_mode==='PAID'?`₹${Number(course.sale_price??course.price??0).toLocaleString('en-IN')}`:'FREE'}</small></span>
                    <em className={`learn-publish ${String(course.publish_status||'DRAFT').toLowerCase()}`}>{course.publish_status||'DRAFT'}</em>
                  </button>)}
                  {!learnCourses.length&&!learnCourseBusy&&<div className="learn-empty">Your first crochet course can start here. 🧶</div>}
                </div>
              </section>
            </section>

            {learnCourseStudio&&<section className="panel learn-studio learn-studio-v2">
              <div className="learn-studio-head">
                <div>
                  <span className="eyebrow">COURSE STUDIO</span>
                  <h3>{learnCourseStudio.course.title}</h3>
                  <p>{learnCourseStudio.course.tagline||'Build a clear learner journey from first lesson to real proof.'}</p>
                </div>
                <div className="learn-studio-actions">
                  <em className={`learn-publish ${String(learnCourseStudio.course.publish_status||'DRAFT').toLowerCase()}`}>{learnCourseStudio.course.publish_status||'DRAFT'}</em>
                </div>
              </div>

              <nav className="learn-studio-tabs">
                {[
                  ["overview","Overview"],
                  ["curriculum","Curriculum"],
                  ["aiContent","AI Content"],
                  ["proof","Project & Proof"],
                  ["pricing","Pricing"],
                  ["publish","Publish"]
                ].map(([id,label])=><button key={id} className={learnStudioTab===id?"active":""} onClick={()=>setLearnStudioTab(id)}>{label}</button>)}
              </nav>

              {learnStudioTab==="overview"&&<div className="learn-studio-overview">
                <section className="learn-overview-hero">
                  <div><small>COURSE STATUS</small><h4>{learnCourseStudio.course.title}</h4><p>{learnCourseStudio.course.description||learnCourseStudio.course.tagline||"No description added yet."}</p></div>
                  <div className="learn-overview-score">
                    <span><b>{learnCourseStudio.modules.length}</b><small>Modules</small></span>
                    <span><b>{learnCourseStudio.modules.reduce((sum,m)=>sum+(m.lessons?.length||0),0)}</b><small>Lessons</small></span>
                    <span><b>{learnCourseStudio.projects?.length||0}</b><small>Projects</small></span>
                  </div>
                </section>
                <div className="learn-overview-grid">
                  <article><span>🎓</span><div><small>Learning</small><b>{learnCourseStudio.course.level||"BEGINNER"} · {learnCourseStudio.course.language||"English"}</b><p>{learnCourseStudio.course.duration_minutes||0} minutes planned learning.</p></div></article>
                  <article><span>💳</span><div><small>Access</small><b>{learnCourseStudio.course.purchase_mode==="PAID"?`₹${Number(learnCourseStudio.course.sale_price??learnCourseStudio.course.price??0).toLocaleString("en-IN")}`:"FREE"}</b><p>{learnCourseStudio.course.access_days?`${learnCourseStudio.course.access_days} days access`:"No fixed expiry configured"}.</p></div></article>
                  <article><span>🧶</span><div><small>Proof</small><b>{learnCourseStudio.course.project_required!==false?"Project required":"Project optional"}</b><p>{learnCourseStudio.projects?.length?"Final project configured.":"No final project added yet."}</p></div></article>
                  <article><span>🏆</span><div><small>Completion</small><b>{learnCourseStudio.course.certificate_enabled!==false?"Certificate enabled":"Certificate disabled"}</b><p>Completion follows actual learner progress.</p></div></article>
                </div>
                <div className="learn-overview-next">
                  <b>Recommended next step</b>
                  <p>{!learnCourseStudio.modules.length?"Add your first module and lesson.":!learnCourseStudio.modules.some(m=>(m.lessons||[]).length)?"Add lessons to your modules.":learnCourseStudio.course.purchase_mode==="PAID"&&Number(learnCourseStudio.course.sale_price??learnCourseStudio.course.price??0)<=0?"Set a valid paid-course price.":learnCourseStudio.course.publish_status!=="PUBLISHED"?"Review Publish readiness.":"Course is published and available to learners."}</p>
                </div>
              </div>}

              {learnStudioTab==="curriculum"&&<div className="learn-studio-columns learn-studio-curriculum">
                <div>
                  <h4>Modules</h4>
                  <p className="learn-tab-help">Build the learner journey in small, ordered sections.</p>
                  <div className="learn-inline-form">
                    <input value={learnModuleForm.title} onChange={e=>setLearnModuleForm({...learnModuleForm,title:e.target.value})} placeholder="Module title"/>
                    <input value={learnModuleForm.description} onChange={e=>setLearnModuleForm({...learnModuleForm,description:e.target.value})} placeholder="What this module teaches"/>
                    <button onClick={addLearnModule}>Add module</button>
                  </div>
                  <div className="learn-module-list">
                    {learnCourseStudio.modules.map((module,index)=><article key={module.id}>
                      <div><span>{String(index+1).padStart(2,'0')}</span><b>{module.title}</b><small>{module.lessons?.length||0} lessons</small></div>
                      {(module.lessons||[]).map((lesson,i)=><div className="learn-lesson" key={lesson.id}>
                        <span>{i+1}</span><b>{lesson.title}</b><em>{lesson.lesson_type}</em>
                        {lesson.source_ai_asset_id&&<small className={`learn-ai-lesson-badge ${lesson.is_active?'active':'staged'}`}>✨ AI Studio v{lesson.source_ai_version} · {lesson.is_active?'Active':'Staged / hidden'}</small>}
                        {lesson.grandma_tip&&<small>💛 Tip: {lesson.grandma_tip}</small>}
                        {lesson.practice_task&&<small>✋ Practice: {lesson.practice_task}</small>}
                      </div>)}
                    </article>)}
                  </div>
                </div>
                <div>
                  <h4>Add lesson</h4>
                  <p className="learn-tab-help">Add one useful learner step at a time.</p>
                  <div className="learn-stack-form">
                    <select value={learnLessonForm.module_id} onChange={e=>setLearnLessonForm({...learnLessonForm,module_id:e.target.value})}>
                      <option value="">Choose module</option>
                      {learnCourseStudio.modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                    <input value={learnLessonForm.title} onChange={e=>setLearnLessonForm({...learnLessonForm,title:e.target.value})} placeholder="Lesson title"/>
                    <select value={learnLessonForm.lesson_type} onChange={e=>setLearnLessonForm({...learnLessonForm,lesson_type:e.target.value})}>
                      <option>VIDEO</option><option>TEXT</option><option>LIVE</option><option>QUIZ</option><option>PRACTICE</option>
                    </select>
                    <input value={learnLessonForm.content_url} onChange={e=>setLearnLessonForm({...learnLessonForm,content_url:e.target.value})} placeholder="Video/content URL"/>
                    <textarea value={learnLessonForm.content_text} onChange={e=>setLearnLessonForm({...learnLessonForm,content_text:e.target.value})} placeholder="Lesson explanation"/>
                    <input value={learnLessonForm.grandma_tip} onChange={e=>setLearnLessonForm({...learnLessonForm,grandma_tip:e.target.value})} placeholder="💛 Helpful teaching tip"/>
                    <input value={learnLessonForm.practice_task} onChange={e=>setLearnLessonForm({...learnLessonForm,practice_task:e.target.value})} placeholder="✋ Practice task"/>
                    <input type="number" value={learnLessonForm.duration_minutes} onChange={e=>setLearnLessonForm({...learnLessonForm,duration_minutes:e.target.value})} placeholder="Minutes"/>
                    <label className="learn-check"><input type="checkbox" checked={learnLessonForm.is_preview} onChange={e=>setLearnLessonForm({...learnLessonForm,is_preview:e.target.checked})}/> Free preview lesson</label>
                    <button onClick={addLearnLesson}>Add lesson</button>
                  </div>
                </div>
              </div>}

              {learnStudioTab==="aiContent"&&<div className="learn-ai-course-tab">
                <section className="learn-ai-course-hero">
                  <div><span>✨</span><div><small>V19.5E · GOVERNED AI CONTENT</small><h4>Approved AI content inside Course Studio.</h4><p>AI Studio content enters here only after human approval. New imports are staged inactive first, so no learner content changes silently.</p></div></div>
                  <button onClick={()=>{setLearnStudioTab("curriculum")}}>Open Curriculum →</button>
                </section>
                <div className="learn-ai-course-list">
                  {learnCourseStudio.modules.flatMap(m=>(m.lessons||[]).filter(l=>l.source_ai_asset_id).map(l=>({...l,module_title:m.title}))).map(lesson=><article key={lesson.id} className={lesson.is_active?'active':'staged'}>
                    <div className="learn-ai-course-icon">{lesson.is_active?'✓':'✨'}</div>
                    <div className="learn-ai-course-main">
                      <div><b>{lesson.title}</b><em className={lesson.is_active?'active':'staged'}>{lesson.is_active?'ACTIVE':'STAGED'}</em></div>
                      <small>{lesson.module_title} · {lesson.lesson_type} · AI source v{lesson.source_ai_version}</small>
                      <p>{lesson.is_active?'Human-approved content is active in this course.':'Human-approved content is staged but still hidden from learners.'}</p>
                    </div>
                    <div className="learn-ai-course-actions">
                      {!lesson.is_active&&<button onClick={()=>activateLearnAiLesson(lesson.id,learnCourseStudio.course.publish_status)} disabled={learnAiBridgeBusy}>Activate</button>}
                      {!lesson.is_active&&<button className="danger-lite" onClick={()=>discardLearnAiStage(lesson.id)} disabled={learnAiBridgeBusy}>Discard</button>}
                      {lesson.is_active&&<span>{lesson.ai_activated_at?learnCommerceDate(lesson.ai_activated_at):'Active'}</span>}
                    </div>
                  </article>)}
                  {!learnCourseStudio.modules.some(m=>(m.lessons||[]).some(l=>l.source_ai_asset_id))&&<div className="learn-empty"><b>No AI Studio content staged for this course.</b><span>Approve an AI Studio asset, then use “Send to Course Studio”.</span></div>}
                </div>
                <div className="learn-ai-course-governance"><span>🛡️</span><div><b>Two-step protection</b><p>1. Human reviewer approves the exact AI Studio version. 2. Admin explicitly stages and activates it in Course Studio. Neither generation nor approval automatically changes learner content.</p></div></div>
              </div>}

              {learnStudioTab==="proof"&&<div className="learn-proof-tab">
                <div className="learn-tab-intro"><span>🧶</span><div><small>PROJECT & PROOF</small><h4>Define what the learner must create.</h4><p>Projects become the bridge from learning to teacher-reviewed evidence.</p></div></div>
                <div className="learn-proof-layout">
                  <div className="learn-stack-form">
                    <input value={learnProjectForm.title} onChange={e=>setLearnProjectForm({...learnProjectForm,title:e.target.value})} placeholder="Final project title"/>
                    <textarea value={learnProjectForm.description} onChange={e=>setLearnProjectForm({...learnProjectForm,description:e.target.value})} placeholder="Project description"/>
                    <textarea value={learnProjectForm.submission_instructions} onChange={e=>setLearnProjectForm({...learnProjectForm,submission_instructions:e.target.value})} placeholder="Photo/video/PDF submission instructions"/>
                    <textarea value={learnProjectForm.evaluation_criteria} onChange={e=>setLearnProjectForm({...learnProjectForm,evaluation_criteria:e.target.value})} placeholder={"One criterion per line\nQuality\nAccuracy\nFinishing"}/>
                    <label>Pass score<input type="number" min="0" max="100" value={learnProjectForm.minimum_score} onChange={e=>setLearnProjectForm({...learnProjectForm,minimum_score:e.target.value})}/></label>
                    <button onClick={addLearnProject}>Add final project</button>
                  </div>
                  <div className="learn-project-list">
                    {(learnCourseStudio.projects||[]).map(p=><article key={p.id}><span>🏁</span><div><b>{p.title}</b><small>Pass score {p.minimum_score}%</small></div></article>)}
                    {!(learnCourseStudio.projects||[]).length&&<div className="learn-empty">No final project yet.</div>}
                  </div>
                </div>
              </div>}

              {learnStudioTab==="pricing"&&<section className="learn-commercial-panel learn-commercial-panel-v2">
                <div className="learn-commercial-panel-head">
                  <div><span className="eyebrow">PRICING & ACCESS</span><h4>What the learner pays and receives</h4><p>These settings power Discover → Course Details → Checkout → Entitlement.</p></div>
                  <div className="learn-commercial-state">
                    <span className={learnCommercialForm.purchase_mode==='PAID'?'paid':'free'}>{learnCommercialForm.purchase_mode}</span>
                    {learnCommercialForm.purchase_mode==='PAID'&&<b>₹{Number(learnCommercialForm.sale_price||learnCommercialForm.price||0).toLocaleString('en-IN')}</b>}
                  </div>
                </div>
                <div className="learn-commercial-grid">
                  <label>Access type<select value={learnCommercialForm.purchase_mode} onChange={e=>setLearnCommercialForm({...learnCommercialForm,purchase_mode:e.target.value,price:e.target.value==='FREE'?'0':learnCommercialForm.price})}><option value="FREE">FREE</option><option value="PAID">PAID</option></select></label>
                  <label>Currency<select value={learnCommercialForm.currency} onChange={e=>setLearnCommercialForm({...learnCommercialForm,currency:e.target.value})}><option value="INR">INR ₹</option></select></label>
                  <label>Regular price<input type="number" min="0" step="1" disabled={learnCommercialForm.purchase_mode==='FREE'} value={learnCommercialForm.price} onChange={e=>setLearnCommercialForm({...learnCommercialForm,price:e.target.value})}/></label>
                  <label>Sale price<input type="number" min="0" step="1" disabled={learnCommercialForm.purchase_mode==='FREE'} value={learnCommercialForm.sale_price} onChange={e=>setLearnCommercialForm({...learnCommercialForm,sale_price:e.target.value})} placeholder="Optional"/></label>
                  <label>Access days<input type="number" min="1" value={learnCommercialForm.access_days} onChange={e=>setLearnCommercialForm({...learnCommercialForm,access_days:e.target.value})} placeholder="Blank = no fixed expiry"/></label>
                  <label className="learn-commercial-check"><input type="checkbox" checked={learnCommercialForm.live_class_included} onChange={e=>setLearnCommercialForm({...learnCommercialForm,live_class_included:e.target.checked})}/> Live class included</label>
                  <label className="wide">Refund / cancellation policy<textarea value={learnCommercialForm.refund_policy_text} onChange={e=>setLearnCommercialForm({...learnCommercialForm,refund_policy_text:e.target.value})} placeholder="Learner-facing refund terms"/></label>
                </div>
                <div className="learn-commercial-foot">
                  <div><b>Entitlement</b><span>{learnCommercialForm.purchase_mode==='FREE'?'Free enrollment unlocks immediately.':'Paid access unlocks only after a valid successful payment.'}</span></div>
                  <button onClick={saveLearnCommercialSettings} disabled={learnCommercialBusy}>{learnCommercialBusy?'Saving…':'Save pricing & access'}</button>
                </div>
              </section>}

              {learnStudioTab==="publish"&&<div className="learn-publish-tab">
                <div className="learn-tab-intro"><span>🚀</span><div><small>PUBLISH READINESS</small><h4>One final check before learners see it.</h4><p>Publishing should be deliberate. HOWDI checks the learning structure and paid-course price.</p></div></div>
                <div className="learn-publish-checks">
                  <article className={learnCourseStudio.modules.length?"ok":"warn"}><span>{learnCourseStudio.modules.length?"✓":"!"}</span><div><b>Modules</b><small>{learnCourseStudio.modules.length?`${learnCourseStudio.modules.length} module(s) ready`:"Add at least one module"}</small></div></article>
                  <article className={learnCourseStudio.modules.some(m=>(m.lessons||[]).length)?"ok":"warn"}><span>{learnCourseStudio.modules.some(m=>(m.lessons||[]).length)?"✓":"!"}</span><div><b>Lessons</b><small>{learnCourseStudio.modules.reduce((s,m)=>s+(m.lessons?.length||0),0)} lesson(s) configured</small></div></article>
                  <article className={learnCourseStudio.course.purchase_mode!=="PAID"||Number(learnCourseStudio.course.sale_price??learnCourseStudio.course.price??0)>0?"ok":"warn"}><span>{learnCourseStudio.course.purchase_mode!=="PAID"||Number(learnCourseStudio.course.sale_price??learnCourseStudio.course.price??0)>0?"✓":"!"}</span><div><b>Pricing</b><small>{learnCourseStudio.course.purchase_mode==="PAID"?`₹${Number(learnCourseStudio.course.sale_price??learnCourseStudio.course.price??0).toLocaleString("en-IN")} learner price`:"Free access"}</small></div></article>
                  <article className={(learnCourseStudio.projects||[]).length||learnCourseStudio.course.project_required===false?"ok":"warn"}><span>{(learnCourseStudio.projects||[]).length||learnCourseStudio.course.project_required===false?"✓":"!"}</span><div><b>Project</b><small>{(learnCourseStudio.projects||[]).length?"Final project configured":learnCourseStudio.course.project_required===false?"Project not required":"Project required but not added"}</small></div></article>
                </div>
                <div className="learn-publish-action-card">
                  <div><small>CURRENT STATUS</small><h4>{learnCourseStudio.course.publish_status||"DRAFT"}</h4><p>{learnCourseStudio.course.publish_status==="PUBLISHED"?"This course is currently visible in the learner Discover catalog.":"This course is hidden from learners until you publish it."}</p></div>
                  {learnCourseStudio.course.publish_status==='PUBLISHED'
                    ?<button className="secondary" onClick={()=>toggleLearnCoursePublish(learnCourseStudio.course,false)}>Move to draft</button>
                    :<button onClick={()=>toggleLearnCoursePublish(learnCourseStudio.course,true)}>Publish course →</button>}
                </div>
              </div>}
            </section>}
          </div>
        )}

{tab==='move' && (
          <div className="page move-admin-page"><MoveAdmin token={token} /></div>
        )}

        {tab==='notifications' && (
          <div className="page notifications-page">
            <section className="notifications-hero">
              <div>
                <span className="eyebrow">HOWDI COMMUNICATION CONTROL</span>
                <h2>One place for every customer update.</h2>
                <p>Create operational, financial and platform notifications without mixing them into orders, payments or social messaging.</p>
              </div>
              <div className="notification-stats-mini">
                <span>🔔</span><strong>{notificationStats.total}</strong><small>total messages</small>
              </div>
            </section>

            <section className="notification-stat-grid">
              <div className="notification-stat"><span>Total</span><strong>{notificationStats.total}</strong><small>All notification records</small></div>
              <div className="notification-stat"><span>Sent</span><strong>{notificationStats.sent}</strong><small>Active delivery records</small></div>
              <div className="notification-stat"><span>Scheduled</span><strong>{notificationStats.scheduled}</strong><small>Future communication</small></div>
              <div className="notification-stat"><span>Draft</span><strong>{notificationStats.draft}</strong><small>Not yet released</small></div>
            </section>

            <section className="notification-workspace">
              <form className="panel notification-compose" onSubmit={createNotification}>
                <div className="list-head"><div><span className="eyebrow">CREATE NOTIFICATION</span><h3>Compose a customer update</h3></div></div>
                <label>Title<input value={notificationForm.title} onChange={e=>setNotificationForm({...notificationForm,title:e.target.value})} placeholder="Example: Your order has shipped" /></label>
                <label>Message<textarea rows="5" value={notificationForm.message} onChange={e=>setNotificationForm({...notificationForm,message:e.target.value})} placeholder="Write a clear and helpful customer message..." /></label>
                <div className="notification-form-grid">
                  <label>Audience<select value={notificationForm.audience} onChange={e=>setNotificationForm({...notificationForm,audience:e.target.value})}><option value="all_customers">All customers</option><option value="selected_customers">Selected customers</option><option value="role">Specific role</option><option value="segment">Future segment</option></select></label>
                  <label>Channel<select value={notificationForm.channel} onChange={e=>setNotificationForm({...notificationForm,channel:e.target.value})}><option value="in_app">In-app</option><option value="email">Email</option><option value="sms">SMS</option><option value="push">Push notification</option></select></label>
                  <label>Type<select value={notificationForm.type} onChange={e=>setNotificationForm({...notificationForm,type:e.target.value})}><option value="system">System</option><option value="order">Order</option><option value="payment">Payment</option><option value="wallet">Wallet</option><option value="reward">Reward</option><option value="delivery">Delivery</option><option value="connect">HOWDI Connect</option></select></label>
                  <label>Delivery<select value={notificationForm.schedule} onChange={e=>setNotificationForm({...notificationForm,schedule:e.target.value})}><option value="now">Send now</option><option value="scheduled">Schedule later</option><option value="draft">Save draft</option></select></label>
                </div>
                <button className="primary full-btn">Create notification →</button>
              </form>

              <section className="panel notification-list-panel">
                <div className="list-head notifications-list-head">
                  <div><span className="eyebrow">COMMUNICATION HISTORY</span><h3>{filteredNotifications.length} records</h3></div>
                  <div className="payments-filters">
                    <select value={notificationFilter} onChange={e=>setNotificationFilter(e.target.value)}><option value="all">All statuses</option><option value="sent">Sent</option><option value="scheduled">Scheduled</option><option value="draft">Draft</option></select>
                    <input className="search" placeholder="Search title, type or audience..." value={notificationSearch} onChange={e=>setNotificationSearch(e.target.value)} />
                  </div>
                </div>
                <div className="notification-list">
                  {filteredNotifications.map(item => <article className="notification-item" key={item.id}>
                    <div className="notification-icon">{item.type==='payment'?'💳':item.type==='wallet'?'👛':item.type==='order'?'🧾':item.type==='reward'?'🎁':item.type==='connect'?'🔗':'🔔'}</div>
                    <div className="notification-copy"><strong>{item.title}</strong><p>{item.message}</p><small>{item.id} · {item.audience.replaceAll('_',' ')} · {item.channel.replaceAll('_',' ')} · {new Date(item.createdAt).toLocaleString('en-IN')}</small></div>
                    <div className="notification-actions"><span className={`notification-status ${item.status}`}>{item.status}</span><select value={item.status} onChange={e=>updateNotificationStatus(item,e.target.value)}><option value="sent">Sent</option><option value="scheduled">Scheduled</option><option value="draft">Draft</option></select></div>
                  </article>)}
                  {filteredNotifications.length===0&&<div className="empty-state">🔔 No notification records yet. Create the first customer communication from the panel on the left.</div>}
                </div>
              </section>
            </section>
          </div>
        )}

        {tab==='settings' && (
          <div className="page platform-settings-page">
            <section className="settings-hero">
              <div>
                <span className="eyebrow">HOWDI PLATFORM CONTROL</span>
                <h2>Platform settings without mixing them into business operations.</h2>
                <p>Feature readiness, operational safeguards and future role controls are grouped here. Production-sensitive settings should later be enforced by backend permissions and audit logs.</p>
              </div>
              <div className="settings-hero-icon">⚙️</div>
            </section>

            <section className="settings-grid">
              <article className="panel settings-card">
                <span className="eyebrow">FEATURE CONTROLS</span>
                <h3>Module readiness</h3>
                <div className="settings-list">
                  {[
                    ['wallet','👛','HOWDI Wallet','Customer wallet experience'],
                    ['connect','🔗','HOWDI Connect','Social and communication foundation'],
                    ['vibe','✨','HOWDI Vibe','Future social discovery layer'],
                    ['withdrawals','🏦','Withdrawals','Release only after real financial controls'],
                  ].map(([key,icon,title,desc]) => (
                    <div className="setting-row" key={key}>
                      <div><span className="setting-icon">{icon}</span><div><strong>{title}</strong><small>{desc}</small></div></div>
                      <button type="button" className={`toggle ${platformSettings[key]?'on':''}`} onClick={()=>updatePlatformSetting(key,!platformSettings[key])}><span /></button>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel settings-card">
                <span className="eyebrow">SECURITY & OPERATIONS</span>
                <h3>Platform safeguards</h3>
                <div className="settings-list">
                  <div className="setting-row">
                    <div><span className="setting-icon">🛡️</span><div><strong>Audit controls</strong><small>Prepare sensitive admin actions for audit tracking</small></div></div>
                    <button type="button" className={`toggle ${platformSettings.audit?'on':''}`} onClick={()=>updatePlatformSetting('audit',!platformSettings.audit)}><span /></button>
                  </div>
                  <div className="setting-row">
                    <div><span className="setting-icon">🚧</span><div><strong>Maintenance mode</strong><small>Visual foundation only until backend enforcement is connected</small></div></div>
                    <button type="button" className={`toggle ${platformSettings.maintenance?'on':''}`} onClick={()=>updatePlatformSetting('maintenance',!platformSettings.maintenance)}><span /></button>
                  </div>
                </div>
                <div className="settings-note"><strong>Production rule</strong><span>Frontend switches are not security controls. Real platform settings must be validated server-side and restricted by role permissions.</span></div>
              </article>

              <article className="panel settings-card">
                <span className="eyebrow">ADMIN & ROLE FOUNDATION</span>
                <h3>Prepare one identity, controlled access.</h3>
                <ul className="settings-checklist">
                  <li>Role-based permissions</li>
                  <li>Least-privilege admin access</li>
                  <li>Sensitive financial action approval</li>
                  <li>Configuration change history</li>
                  <li>Future multi-role HOWDI identity</li>
                </ul>
              </article>

              <article className="panel settings-card">
                <span className="eyebrow">NEXT BACKEND CONNECTION</span>
                <h3>What becomes real later</h3>
                <p>PostgreSQL-backed configuration, admin roles, permissions, audit records and server-side feature flags will replace local browser settings during the deep backend phase.</p>
              </article>
            </section>
          </div>
        )}

        {tab==='coupons' && (
          <div className="page">
            <section className="coupon-hero"><div><span className="eyebrow">HOWDI PROMO ENGINE</span><h2>Unique codes. Clear rules. Ready for campaigns.</h2><p>Phase A stores coupons safely in this Admin browser while we prepare the backend/database coupon engine.</p></div><div className="coupon-hero-stats"><span><b>{coupons.length}</b> total</span><span><b>{coupons.filter(c=>getCouponStatus(c)==='LIVE').length}</b> live</span></div></section>
            <section className="coupon-workspace">
              <form className="editor panel coupon-editor" onSubmit={saveCoupon}>
                <div className="panel-head"><div><span className="eyebrow">PROMO CREATOR</span><h3>{editingCoupon?'Edit coupon':'Create coupon'}</h3></div>{editingCoupon&&<span className="reserved">EDITING</span>}</div>
                <label>Coupon code<div className="coupon-code-row"><input placeholder="HOWDI10" value={couponForm.code} onChange={e=>setCouponForm({...couponForm,code:e.target.value.toUpperCase()})} required/><button type="button" className="generate-code" onClick={generateCouponCode}>✨ Generate</button></div></label>
                <label>Internal campaign name<input placeholder="Example: Diwali Welcome Campaign" value={couponForm.campaignName} onChange={e=>setCouponForm({...couponForm,campaignName:e.target.value})}/></label>
                <div className="coupon-two-col"><label>Discount type<select value={couponForm.discountType} onChange={e=>setCouponForm({...couponForm,discountType:e.target.value})}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount (₹)</option></select></label><label>Discount value<input type="number" min="1" placeholder="10" value={couponForm.discountValue} onChange={e=>setCouponForm({...couponForm,discountValue:e.target.value})} required/></label></div>
                <div className="coupon-two-col"><label>Minimum order ₹<input type="number" min="0" placeholder="0 = no minimum" value={couponForm.minimumOrderValue} onChange={e=>setCouponForm({...couponForm,minimumOrderValue:e.target.value})}/></label><label>Maximum discount ₹<input type="number" min="0" placeholder="0 = no cap" value={couponForm.maximumDiscount} onChange={e=>setCouponForm({...couponForm,maximumDiscount:e.target.value})}/></label></div>
                <div className="coupon-two-col"><label>Start date & time<input type="datetime-local" value={couponForm.startDate} onChange={e=>setCouponForm({...couponForm,startDate:e.target.value})}/></label><label>End date & time<input type="datetime-local" value={couponForm.endDate} onChange={e=>setCouponForm({...couponForm,endDate:e.target.value})}/></label></div>
                <div className="coupon-two-col"><label>Total usage limit<input type="number" min="0" placeholder="0 = unlimited" value={couponForm.usageLimit} onChange={e=>setCouponForm({...couponForm,usageLimit:e.target.value})}/></label><label>Per customer limit<input type="number" min="1" value={couponForm.perCustomerLimit} onChange={e=>setCouponForm({...couponForm,perCustomerLimit:e.target.value})}/></label></div>
                <label className="check"><input type="checkbox" checked={couponForm.firstOrderOnly} onChange={e=>setCouponForm({...couponForm,firstOrderOnly:e.target.checked})}/> First order customers only</label>
                <label className="check"><input type="checkbox" checked={couponForm.active} onChange={e=>setCouponForm({...couponForm,active:e.target.checked})}/> Coupon active</label>
                <div className="actions"><button className="primary">{editingCoupon?'Update coupon':'Create coupon'}</button>{editingCoupon&&<button type="button" onClick={resetCouponForm}>Cancel</button>}</div>
              </form>
              <section className="panel coupon-list"><div className="list-head coupon-list-head"><div><span className="eyebrow">PROMO LIBRARY</span><h3>{filteredCoupons.length} of {coupons.length} coupons</h3></div><input className="search" placeholder="Search coupon or campaign..." value={couponSearch} onChange={e=>setCouponSearch(e.target.value)}/></div><div className="coupon-table">{filteredCoupons.map(coupon=>{const status=getCouponStatus(coupon);const statusClass=status.toLowerCase().replaceAll(' ','-');return <article className="coupon-item" key={coupon.id}><div className="coupon-main"><div className="coupon-ticket">🎟️</div><div className="coupon-name"><strong>{coupon.code}</strong><span>{coupon.campaignName||'No campaign name'}</span></div></div><div className="coupon-summary"><b>{coupon.discountType==='percentage'?`${coupon.discountValue}% OFF`:`₹${Number(coupon.discountValue).toLocaleString('en-IN')} OFF`}</b><span>Min ₹{Number(coupon.minimumOrderValue||0).toLocaleString('en-IN')} · Limit {coupon.usageLimit||'∞'}</span></div><span className={`coupon-status ${statusClass}`}>{status}</span><div className="coupon-actions"><button onClick={()=>toggleCoupon(coupon)}>{coupon.active?'Pause':'Activate'}</button><button onClick={()=>editCoupon(coupon)}>Edit</button><button className="danger-button" onClick={()=>deleteCoupon(coupon)}>Delete</button></div></article>})}{filteredCoupons.length===0&&<div className="empty-state">🎟️ {coupons.length?'No matching coupons found.':'No coupons created yet. Create your first HOWDI promo code.'}</div>}</div></section>
            </section>
          </div>
        )}

      </main>
    </div>
  );
}

export default AdminApp;
