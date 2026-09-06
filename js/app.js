import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAIL } from './config.js';

// API 키 입력 여부 확인
if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    alert("Firebase 설정이 완료되지 않았습니다.\njs/config.js 파일에 API Key를 입력해주세요.");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentSection = null;
let currentUser = null;
let userRole = 'student';
let sortOrder = 'createdAt';

// 다국어 설정
const translations = {
    ko: {
        select_section: "분반을 선택하세요",
        enter_pw: "접근 비밀번호 입력",
        pw_placeholder: "비밀번호를 입력하세요",
        next_step: "다음 단계",
        login_title: "로그인",
        email_placeholder: "이메일",
        pw_placeholder: "비밀번호",
        login_btn: "로그인",
        no_account: "계정이 없으신가요?",
        signup_link: "회원가입",
        signup_title: "회원가입",
        name_placeholder: "이름",
        sid_placeholder: "학번",
        email_placeholder: "이메일",
        pw_placeholder: "비밀번호",
        signup_btn: "가입 완료",
        have_account: "이미 계정이 있으신가요?",
        login_link: "로그인",
        admin_dash: "관리자 대시보드",
        logout_btn: "로그아웃",
        sort_new: "최신순",
        sort_vote: "추천순",
        ask_btn: "+ 질문하기",
        back_btn: "돌아가기",
        admin_title: "학생 관리 대시보드",
        col_name: "이름",
        col_sid: "학번",
        col_email: "이메일",
        modal_title: "질문 작성",
        q_title_ph: "제목을 입력하세요",
        q_content_ph: "내용을 입력하세요",
        cancel_btn: "취소",
        submit_btn: "등록하기",
        welcome_msg: "님 환영합니다.",
        pw_wrong: "비밀번호가 틀렸습니다.",
        user_not_found: "사용자 정보가 없습니다. 회원가입을 먼저 진행해주세요.",
        loading_q: "질문을 불러오는 중입니다...",
        no_q: "아직 등록된 질문이 없습니다.",
        ans_placeholder: "답변을 입력하세요...",
        submit_ans_btn: "등록",
        delete_confirm: "정말 삭제하시겠습니까?",
        loading_students: "학생 목록을 불러오는 중입니다...",
        // Category options
        cat_all: "전체",
        cat_w1: "1주차",
        cat_w2: "2주차",
        cat_w3: "3주차"
    },
    en: {
        select_section: "Select your section",
        enter_pw: "Enter Access Password",
        pw_placeholder: "Please enter password",
        next_step: "Next Step",
        login_title: "Login",
        email_placeholder: "Email",
        pw_placeholder: "Password",
        login_btn: "Login",
        no_account: "Don't have an account?",
        signup_link: "Sign Up",
        signup_title: "Create Account",
        name_placeholder: "Name",
        sid_placeholder: "Student ID",
        email_placeholder: "Email",
        pw_placeholder: "Password",
        signup_btn: "Complete Sign-up",
        have_account: "Already have an account?",
        login_link: "Login",
        admin_dash: "Admin Dashboard",
        logout_btn: "Logout",
        sort_new: "Newest",
        sort_vote: "Most Upvoted",
        ask_btn: "+ Ask Question",
        back_btn: "Go Back",
        admin_title: "Student Management Dashboard",
        col_name: "Name",
        col_sid: "Student ID",
        col_email: "Email",
        modal_title: "Post a Question",
        q_title_ph: "Enter title",
        q_content_ph: "Enter content",
        cancel_btn: "Cancel",
        submit_btn: "Submit",
        welcome_msg: " Welcome!",
        pw_wrong: "Incorrect password.",
        user_not_found: "User information not found. Please sign up first.",
        loading_q: "Loading questions...",
        no_q: "No questions posted yet.",
        ans_placeholder: "Write an answer...",
        submit_ans_btn: "Submit",
        delete_confirm: "Are you sure you want to delete this?",
        loading_students: "Loading student list...",
        // Category options
        cat_all: "All",
        cat_w1: "Week 1",
        cat_w2: "Week 2",
        cat_w3: "Week 3"
    }
};

function updateLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = translations[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = translations[lang][key];
    });

    // Category select update
    const catSelect = document.getElementById('q-category');
    if (catSelect) {
        catSelect.innerHTML = '';
        const cats = [
            { val: '전체', text: translations[lang].cat_all },
            { val: '1주차', text: translations[lang].cat_w1 },
            { val: '2주차', text: translations[lang].cat_w2 },
            { val: '3주차', text: translations[lang].cat_w3 }
        ];
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.val;
            opt.text = c.text;
            catSelect.appendChild(opt);
        });
    }
}

window.selectSection = (section) => {
    currentSection = section;
    // 분반에 따른 언어 설정: 1분반만 한국어, 나머지는 영어
    const lang = (section === 1) ? 'ko' : 'en';
    updateLanguage(lang);
    showView('view-password');
};

window.verifyPassword = () => {
    const pw = document.getElementById('common-pw').value;
    if(pw === '1234') { 
        showView('view-auth');
    } else {
        const lang = (currentSection === 1) ? 'ko' : 'en';
        alert(translations[lang].pw_wrong);
    }
};

window.toggleAuth = (isSignup) => {
    document.getElementById('auth-login').classList.toggle('hidden', isSignup);
    document.getElementById('auth-signup').classList.toggle('hidden', !isSignup);
};

function showView(viewId) {
    ['view-section', 'view-password', 'view-auth', 'view-main', 'view-admin'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}

window.handleSignup = async () => {
    const name = document.getElementById('sign-name').value;
    const studentId = document.getElementById('sign-student-id').value;
    const email = document.getElementById('sign-email').value;
    const password = document.getElementById('sign-pw').value;

    if(!name || !studentId || !email || !password) {
        const lang = (currentSection === 1) ? 'ko' : 'en';
        return alert(translations[lang].no_account); // Temporary placeholder for "fill all fields"
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        const role = (email === ADMIN_EMAIL) ? 'admin' : 'student';
        await addDoc(collection(db, "users"), { uid, name, studentId, email, role });
        const lang = (currentSection === 1) ? 'ko' : 'en';
        alert('회원가입이 완료되었습니다!'); // Simplified for now
    } catch (e) { alert("가입 실패: " + e.message); }
};

window.handleLogin = async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pw').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) { alert("로그인 실패: " + e.message); }
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

const sectionNames = {
    1: "지능로봇제어",
    2: "Discrete mathematics",
    3: "Computer Architecture and Organization 01",
    4: "Computer Architecture and Organization 02"
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            const lang = (currentSection === 1) ? 'ko' : 'en';
            alert(translations[lang].user_not_found);
            return;
        }
        const userData = userDoc.data();
        userRole = userData.role;
        document.getElementById('display-section').innerText = sectionNames[currentSection] || '전체';
        
        const lang = (currentSection === 1) ? 'ko' : 'en';
        document.getElementById('user-info').innerText = `${userData.name}(${userData.studentId}) ${translations[lang].welcome_msg}`;
        if(userRole === 'admin') document.getElementById('btn-admin-dash').classList.remove('hidden');
        showView('view-main');
        loadQuestions();
    } else {
        if(!currentSection) showView('view-section');
        else if(document.getElementById('common-pw')?.value !== '1234') showView('view-password');
        else showView('view-auth');
    }
});

window.setSort = (order) => {
    sortOrder = order;
    const lang = (currentSection === 1) ? 'ko' : 'en';
    document.getElementById('sort-new').className = (order === 'createdAt') ? 'px-4 py-2 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700' : 'px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition';
    document.getElementById('sort-vote').className = (order === 'upvotesCount') ? 'px-4 py-2 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700' : 'px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition';
    loadQuestions();
};

async function loadQuestions() {
    const qList = document.getElementById('question-list');
    const lang = (currentSection === 1) ? 'ko' : 'en';
    qList.innerHTML = `<p class="text-center text-gray-500">${translations[lang].loading_q}</p>`;

    try {
        const qQuery = query(collection(db, "questions"), where("section", "==", currentSection), orderBy(sortOrder, 'desc'));
        const snapshot = await getDocs(qQuery);
        qList.innerHTML = '';

        if(snapshot.empty) {
            qList.innerHTML = `<p class="text-center text-gray-500 py-10">${translations[lang].no_q}</p>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const q = docSnap.data();
            const id = docSnap.id;
            const isOwnerOrAdmin = (q.uid === currentUser.uid || userRole === 'admin');
            const hasUpvoted = q.upvotedBy?.includes(currentUser.uid);

            const card = document.createElement('div');
            card.className = "bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <span class="text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded">${q.category}</span>
                        <h3 class="text-xl font-bold mt-2">${q.title}</h3>
                        <p class="text-sm text-gray-400">${q.authorName}(${q.authorStudentId}) | ${q.createdAt?.toDate().toLocaleString() || '방금 전'}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="upvote('questions', '${id}', ${hasUpvoted})" class="p-2 rounded-lg ${hasUpvoted ? 'bg-orange-100 text-orange-600' : 'bg-gray-100'} transition">
                            <i class="fa-solid fa-thumbs-up"></i> <span class="font-bold">${q.upvotesCount}</span>
                        </button>
                        ${isOwnerOrAdmin ? `<button onclick="deleteItem('questions', '${id}')" class="p-2 text-gray-400 hover:text-red-500 transition"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                </div>
                <p class="text-gray-700 mb-6 whitespace-pre-wrap">${q.content}</p>
                <div class="border-t pt-4 mt-4">
                    <div id="answers-${id}" class="space-y-3 mb-4"></div>
                    <div class="flex gap-2">
                        <input type="text" id="ans-input-${id}" class="flex-1 p-2 border rounded-lg text-sm" placeholder="${translations[lang].ans_placeholder}">
                        <button onclick="submitAnswer('${id}')" class="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-black transition">${translations[lang].submit_ans_btn}</button>
                    </div>
                </div>
            `;
            qList.appendChild(card);
            loadAnswers(id);
        });
    } catch (e) {
        qList.innerHTML = `<p class="text-center text-red-500">오류 발생: ${e.message}<br>Firestore 인덱스 설정이 필요할 수 있습니다.</p>`;
    }
}

async function loadAnswers(questionId) {
    const ansDiv = document.getElementById(`answers-${questionId}`);
    const lang = (currentSection === 1) ? 'ko' : 'en';
    const aQuery = query(collection(db, "answers"), where("questionId", "==", questionId), orderBy("upvotesCount", 'desc'));
    const snapshot = await getDocs(aQuery);
    ansDiv.innerHTML = '';

    snapshot.forEach(docSnap => {
        const a = docSnap.data();
        const id = docSnap.id;
        const isOwnerOrAdmin = (a.uid === currentUser.uid || userRole === 'admin');
        const hasUpvoted = a.upvotedBy?.includes(currentUser.uid);

        ansDiv.innerHTML += `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                <div><span class="font-bold">${a.authorName}(${a.authorStudentId})</span>: ${a.content}</div>
                <div class="flex gap-2 items-center">
                    <button onclick="upvote('answers', '${id}', ${hasUpvoted})" class="text-xs ${hasUpvoted ? 'text-orange-600' : 'text-gray-400'}">
                        <i class="fa-solid fa-thumbs-up"></i> ${a.upvotesCount}
                    </button>
                    ${isOwnerOrAdmin ? `<button onclick="deleteItem('answers', '${id}')" class="text-xs text-gray-300 hover:text-red-도en-500"><i class="fa-solid fa-xmark"></i></button>` : ''}
                </div>
            </div>
        `;
    });
}

window.submitAnswer = async (questionId) => {
    const content = document.getElementById(`ans-input-${questionId}`).value;
    if(!content) {
        const lang = (currentSection === 1) ? 'ko' : 'en';
        return alert(translations[lang].ans_placeholder); // Placeholder for "please enter answer"
    }
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const { name, studentId } = userDoc.data();

    await addDoc(collection(db, "answers"), {
        questionId, content, uid: currentUser.uid, authorName: name, authorStudentId: studentId,
        upvotesCount: 0, upvotedBy: [], createdAt: serverTimestamp()
    });
    document.getElementById(`ans-input-${questionId}`).value = '';
    loadAnswers(questionId);
};

window.deleteItem = async (col, id) => {
    if(confirm(translations[(currentSection === 1 ? 'ko' : 'en')].delete_confirm)) {
        await deleteDoc(doc(db, col, id));
        loadQuestions();
    }
};

window.showAdminDashboard = async () => {
    showView('view-admin');
    const lang = (currentSection === 1) ? 'ko' : 'en';
    const snap = await getDocs(collection(db, "users"));
    const list = document.getElementById('student-list');
    list.innerHTML = `<p class="text-center text-gray-500">${translations[lang].loading_students}</p>`;
    snap.forEach(docSnap => {
        const u = docSnap.data();
        if(u.role === 'student') {
            list.innerHTML += `<tr class="border-bg-gray-50 border-b hover:bg-gray-50"><td class="p-4">${u.name}</td><td class="p-4">${u.studentId}</td><td class="p-4">${u.email}</td></tr>`;
        }
    });
};

window.showMain = () => showView('view-main');
window.openModal = (id) => {
    const lang = (currentSection === 1) ? 'ko' : 'en';
    document.getElementById(id).classList.remove('hidden');
    // Modal open 시 카테고리 옵션 최신화 (언어 반영)
    if(id === 'modal-question') {
        const catSelect = document.getElementById('q-category');
        catSelect.innerHTML = '';
        const cats = [
            { val: '전체', text: translations[lang].cat_all },
            { val: '1주차', text: translations[lang].cat_w1 },
            { val: '2주차', text: translations[lang].cat_w2 },
            { val: '3주차', text: translations[lang].cat_w3 }
        ];
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.val;
            opt.text = c.text;
            catSelect.appendChild(opt);
        });
    }
};

window.closeModal = (id) => document.getElementById(id).classList.remove('hidden'); // Bug fix: .add('hidden') should be used
window.closeModal = (id) => document.getElementById(id).classList.add('hidden'); 

