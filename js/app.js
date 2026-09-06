import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAIL } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentSection = null;
let currentUser = null;
let userRole = 'student';
let sortOrder = 'createdAt';
let isSigningUp = false;
let currentCategoryFilter = null; 

// 🌟 데이터베이스의 과거 '1주차' 기록을 'Week 1'로 실시간 번역해주는 함수
function normalizeCategory(cat) {
    if (!cat) return 'All';
    if (cat === '전체' || cat === 'All') return 'All';
    if (cat.includes('주차')) return 'Week ' + cat.replace('주차', '').trim();
    return cat;
}

const translations = {
    ko: {
        select_section: "분반을 선택하세요 (Select your section)",
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
        refresh_btn: "새로고침",
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
        loading_students: "학생 목록을 불러오는 중입니다..."
    },
    en: {
        select_section: "분반을 선택하세요 (Select your section)",
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
        refresh_btn: "Refresh",
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
        loading_students: "Loading student list..."
    }
};

function populateCategories() {
    const catSelect = document.getElementById('q-category');
    if (!catSelect) return;
    
    catSelect.innerHTML = '';
    
    const allOpt = document.createElement('option');
    allOpt.value = 'All';
    allOpt.text = 'All';
    catSelect.appendChild(allOpt);

    for(let i = 1; i <= 16; i++) {
        const opt = document.createElement('option');
        opt.value = `Week ${i}`;
        opt.text = `Week ${i}`;
        catSelect.appendChild(opt);
    }
}

// 🌟 화면 상단에 1~16주차 필터 버튼들을 그려주는 함수
function renderFilterBar() {
    const container = document.getElementById('filter-buttons');
    if (!container) return; // HTML에 영역이 없으면 무시
    
    container.innerHTML = '';
    
    const cats = ['All'];
    for(let i=1; i<=16; i++) cats.push(`Week ${i}`);

    cats.forEach(cat => {
        const isActive = (currentCategoryFilter || 'All') === cat;
        const btn = document.createElement('button');
        btn.innerText = cat;
        
        // 클릭된 버튼은 진한 파란색으로, 나머지는 연한 회색으로 표시
        btn.className = isActive 
            ? 'px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-full shadow-md transition' 
            : 'px-4 py-1.5 bg-white border border-gray-300 text-gray-600 hover:text-indigo-600 text-sm font-medium rounded-full hover:bg-indigo-50 transition shadow-sm';
        
        btn.onclick = () => filterByCategory(cat);
        container.appendChild(btn);
    });
}

function updateLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.innerText = translations[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang][key]) el.placeholder = translations[lang][key];
    });
    populateCategories(); 
}

window.filterByCategory = (category) => {
    if (category === 'All') {
        currentCategoryFilter = null;
    } else {
        currentCategoryFilter = category;
    }
    loadQuestions();
};

window.refreshData = () => {
    loadQuestions();
};

window.selectSection = (section) => {
    currentSection = section;
    currentCategoryFilter = null; 
    const lang = (section === 1 || section === 4) ? 'ko' : 'en';
    updateLanguage(lang);
    showView('view-password');
};

window.verifyPassword = async () => {
    const pw = document.getElementById('common-pw').value;
    const lang = (currentSection === 1 || currentSection === 4) ? 'ko' : 'en';

    if (!pw) {
        alert(translations[lang].pw_wrong);
        return;
    }

    try {
        const authDocRef = doc(db, "section_auth", `${currentSection}_${pw}`);
        const authDocSnap = await getDoc(authDocRef);

        if (authDocSnap.exists()) {
            if (currentUser) {
                document.getElementById('display-section').innerText = sectionNames[currentSection] || '전체';
                showView('view-main');
                loadQuestions();
            } else {
                showView('view-auth');
            }
        } else {
            alert(translations[lang].pw_wrong);
        }
    } catch (error) {
        console.error("Password verification error:", error);
        alert("인증 서버에 문제가 발생했습니다.");
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
    const target = document.getElementById(viewId);
    if(target) target.classList.remove('hidden');
}

window.handleSignup = async () => {
    const name = document.getElementById('sign-name').value;
    const studentId = document.getElementById('sign-student-id').value;
    const email = document.getElementById('sign-email').value;
    const password = document.getElementById('sign-pw').value;

    if(!name || !studentId || !email || !password) {
        const lang = (currentSection === 1 || currentSection === 4) ? 'ko' : 'en';
        return alert(translations[lang].no_account);
    }

    try {
        isSigningUp = true;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        const role = (email === ADMIN_EMAIL) ? 'admin' : 'student';
        
        await setDoc(doc(db, "users", uid), { uid, name, studentId, email, role });
        
        const lang = (currentSection === 1 || currentSection === 4) ? 'ko' : 'en';
        alert(lang === 'ko' ? '회원가입이 완료되었습니다!' : 'Registration Complete!'); 
        isSigningUp = false;
    } catch (e) { 
        isSigningUp = false;
        alert("Signup failed: " + e.message); 
    }
};

window.handleLogin = async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pw').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) { alert("Login failed: " + e.message); }
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

const sectionNames = {
    1: "지능로봇제어",
    2: "Discrete mathematics",
    3: "Computer Architecture and Organization",
    4: "한동인성교육"
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            if(!isSigningUp) {
                const lang = (currentSection === 1 || currentSection === 4) ? 'ko' : 'en';
                alert(translations[lang]?.user_not_found || translations['ko'].user_not_found);
                await signOut(auth); 
            }
            return;
        }
        const userData = userDoc.data();
        userRole = userData.role;
        
        const lang = (currentSection === 1 || currentSection === 4) ? 'ko' : 'en';
        document.getElementById('user-info').innerText = `${userData.name}(${userData.studentId}) ${translations[lang]?.welcome_msg || '님 환영합니다.'}`;
        if(userRole === 'admin') document.getElementById('btn-admin-dash').classList.remove('hidden');
        
        if (currentSection) {
            document.getElementById('display-section').innerText = sectionNames[currentSection] || '전체';
            showView('view-main');
            loadQuestions();
        }
    } else {
        currentUser = null;
        if(!currentSection) {
            showView('view-section');
        }
    }
});

window.setSort = (order) => {
    sortOrder = order;
    document.getElementById('sort-new').className = (order === 'createdAt') ? 'px-4 py-2 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700' : 'px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition';
    document.getElementById('sort-vote').className = (order === 'upvotesCount') ? 'px-4 py-2 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700' : 'px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition';
    loadQuestions();
};

async function loadQuestions() {
    renderFilterBar(); // 질문을 불러올 때 필터 버튼 영역도 새롭게 칠해줍니다.
    const qList = document.getElementById('question-list');
    const lang = (currentSection === 1 || currentSection === 4) ? 'ko' : 'en';
    qList.innerHTML = `<p class="text-center text-gray-500">${translations[lang].loading_q}</p>`;

    try {
        const qQuery = query(collection(db, "questions"), where("section", "==", currentSection), orderBy(sortOrder, 'desc'));
        const snapshot = await getDocs(qQuery);
        qList.innerHTML = '';

        if(snapshot.empty) {
            qList.innerHTML = `<p class="text-center text-gray-500 py-10">${translations[lang].no_q}</p>`;
            return;
        }

        let hasVisibleQuestions = false;

        snapshot.forEach((docSnap) => {
            const q = docSnap.data();
            const id = docSnap.id;
            
            // 🌟 1주차 -> Week 1 로 강제 번역
            const normCat = normalizeCategory(q.category);

            // 필터링 적용 (현재 선택된 필터가 있고, 번역된 카테고리와 다르면 건너뜀)
            if (currentCategoryFilter && normCat !== currentCategoryFilter) {
                return; 
            }
            
            hasVisibleQuestions = true;
            const isOwnerOrAdmin = (q.uid === currentUser.uid || userRole === 'admin');
            const hasUpvoted = q.upvotedBy?.includes(currentUser.uid);

            const card = document.createElement('div');
            card.className = "bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <span onclick="filterByCategory('${normCat}')" class="cursor-pointer text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-200 transition" title="${lang === 'ko' ? '클릭하여 이 주차만 모아보기' : 'Click to filter by this week'}">${normCat}</span>
                        <h3 class="text-xl font-bold mt-2">${q.title}</h3>
                        <p class="text-sm text-gray-400">${q.authorName}(${q.authorStudentId}) | ${q.createdAt?.toDate().toLocaleString() || 'Just now'}</p>
                    </div>
                    <div class="flex gap-2">
                        <button id="upvote-q-${id}" onclick="upvote('questions', '${id}', ${hasUpvoted})" class="p-2 rounded-lg ${hasUpvoted ? 'bg-orange-100 text-orange-600' : 'bg-gray-100'} transition">
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

        if (!hasVisibleQuestions && currentCategoryFilter) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = "text-center text-gray-500 py-10";
            emptyMsg.innerText = lang === 'ko' ? '해당 주차에 등록된 질문이 없습니다.' : 'No questions found for this week.';
            qList.appendChild(emptyMsg);
        }

    } catch (e) {
        let errorHtml = e.message;
        const linkMatch = e.message.match(/https:\/\/[^\s]+/);
        if (linkMatch) {
            errorHtml = `색인(Index) 생성이 필요합니다.<br><br><a href="${linkMatch[0]}" target="_blank" class="text-blue-600 underline font-bold text-lg bg-blue-50 p-2 rounded">👉 여기를 클릭해서 색인을 생성해주세요</a><br><br>(생성 완료 후 새로고침 해주세요)`;
        }
        qList.innerHTML = `<div class="text-center text-red-500 py-10">${errorHtml}</div>`;
    }
}

async function loadAnswers(questionId) {
    const ansDiv = document.getElementById(`answers-${questionId}`);
    try {
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
                        <button id="upvote-a-${id}" onclick="upvote('answers', '${id}', ${hasUpvoted})" class="text-xs ${hasUpvoted ? 'text-orange-600' : 'text-gray-400'}">
                            <i class="fa-solid fa-thumbs-up"></i> <span>${a.upvotesCount}</span>
                        </button>
                        ${isOwnerOrAdmin ? `<button onclick="deleteItem('answers', '${id}')" class="text-xs text-gray-300 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>` : ''}
                    </div>
                </div>
            `;
        });
    } catch (e) {
        const linkMatch = e.message.match(/https:\/\/[^\s]+/);
        if (linkMatch) {
            ansDiv.innerHTML = `<p class="text-xs text-red-500 p-2 bg-red-50 rounded">답변 색인 생성 필요: <a href="${linkMatch[0]}" target="_blank" class="text-blue-600 underline font-bold">여기를 클릭하세요</a></p>`;
        } else {
            ansDiv.innerHTML = `<p class="text-xs text-red-500">Error: ${e.message}</p>`;
        }
    }
}

window.submitQuestion = async () => {
    const category = document.getElementById('q-category').value;
    const title = document.getElementById('q-title').value;
    const content = document.getElementById('q-content').value;
    const lang = (currentSection === 1 || currentSection === 4) ? 'ko' : 'en';

    if (!title.trim() || !content.trim()) {
        alert(lang === 'ko' ? '제목과 내용을 모두 입력해주세요.' : 'Please enter both title and content.');
        return;
    }
    
    const submitBtn = document.querySelector('button[onclick="submitQuestion()"]');
    if (submitBtn) {
        submitBtn.innerText = lang === 'ko' ? '처리 중...' : 'Processing...';
        submitBtn.disabled = true;
    }

    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const { name, studentId } = userDoc.data();

        await addDoc(collection(db, "questions"), {
            section: currentSection,
            category: category,
            title: title,
            content: content,
            uid: currentUser.uid,
            authorName: name,
            authorStudentId: studentId,
            upvotesCount: 0,
            upvotedBy: [],
            createdAt: serverTimestamp()
        });

        document.getElementById('q-title').value = '';
        document.getElementById('q-content').value = '';
        
        closeModal('modal-question');
        loadQuestions(); 
    } catch (e) {
        console.error(e);
        alert("등록에 실패했습니다: " + e.message);
    } finally {
        if (submitBtn) {
            submitBtn.innerText = lang === 'ko' ? '등록하기' : 'Submit';
            submitBtn.disabled = false;
        }
    }
};

window.submitAnswer = async (questionId) => {
    const content = document.getElementById(`ans-input-${questionId}`).value;
    if(!content) return;
    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const { name, studentId } = userDoc.data();

        await addDoc(collection(db, "answers"), {
            questionId, content, uid: currentUser.uid, authorName: name, authorStudentId: studentId,
            upvotesCount: 0, upvotedBy: [], createdAt: serverTimestamp()
        });
        document.getElementById(`ans-input-${questionId}`).value = '';
        loadAnswers(questionId);
    } catch (e) {
        alert("답변 등록에 실패했습니다: " + e.message);
    }
};

window.deleteItem = async (col, id) => {
    const lang = (currentSection === 1 || currentSection === 4) ? 'ko' : 'en';
    if(confirm(translations[lang].delete_confirm)) {
        await deleteDoc(doc(db, col, id));
        loadQuestions();
    }
};

window.showAdminDashboard = async () => {
    showView('view-admin');
    const lang = (currentSection === 1 || currentSection === 4) ? 'ko' : 'en';
    const snap = await getDocs(collection(db, "users"));
    const list = document.getElementById('student-list');
    list.innerHTML = `<p class="text-center text-gray-500">${translations[lang].loading_students}</p>`;
    list.innerHTML = '';
    snap.forEach(docSnap => {
        const u = docSnap.data();
        if(u.role === 'student') {
            list.innerHTML += `<tr class="border-b hover:bg-gray-50"><td class="p-4">${u.name}</td><td class="p-4">${u.studentId}</td><td class="p-4">${u.email}</td></tr>`;
        }
    });
};

window.showMain = () => showView('view-main');

window.openModal = (id) => {
    document.getElementById(id).classList.remove('hidden');
    if(id === 'modal-question') {
        populateCategories();
    }
};

window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

window.upvote = async (col, id, hasUpvoted) => {
    const btnId = col === 'questions' ? `upvote-q-${id}` : `upvote-a-${id}`;
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    const span = btn.querySelector('span');
    let count = parseInt(span.innerText);
    
    if (hasUpvoted) {
        count = Math.max(0, count - 1);
        span.innerText = count;
        btn.setAttribute('onclick', `upvote('${col}', '${id}', false)`);
        if (col === 'questions') {
            btn.className = "p-2 rounded-lg bg-gray-100 transition";
        } else {
            btn.className = "text-xs text-gray-400";
        }
    } else {
        count = count + 1;
        span.innerText = count;
        btn.setAttribute('onclick', `upvote('${col}', '${id}', true)`);
        if (col === 'questions') {
            btn.className = "p-2 rounded-lg bg-orange-100 text-orange-600 transition";
        } else {
            btn.className = "text-xs text-orange-600";
        }
    }

    try {
        const ref = doc(db, col, id);
        const snap = await getDoc(ref);
        const data = snap.data();
        const newCount = hasUpvoted ? Math.max(0, (data.upvotesCount || 1) - 1) : (data.upvotesCount || 0) + 1;
        await updateDoc(ref, {
            upvotesCount: newCount,
            upvotedBy: hasUpvoted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
        });
    } catch(e) {
        console.error("Upvote error:", e);
    }
};

window.goBackToSections = () => {
    currentSection = null;
    currentCategoryFilter = null; 
    document.getElementById('common-pw').value = '';
    showView('view-section');
};