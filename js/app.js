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

window.selectSection = (section) => {
    currentSection = section;
    showView('view-password');
};

window.verifyPassword = () => {
    const pw = document.getElementById('common-pw').value;
    if(pw === '1234') { 
        showView('view-auth');
    } else {
        alert('비밀번호가 틀렸습니다.');
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

    if(!name || !studentId || !email || !password) return alert("모든 필드를 입력해주세요.");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        const role = (email === ADMIN_EMAIL) ? 'admin' : 'student';
        await addDoc(collection(db, "users"), { uid, name, studentId, email, role });
        alert('회원가입이 완료되었습니다!');
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
            alert('사용자 정보가 없습니다. 회원가입을 먼저 진행해주세요.');
            return;
        }
        const userData = userDoc.data();
        userRole = userData.role;
        document.getElementById('display-section').innerText = sectionNames[currentSection] || '전체';
        document.getElementById('user-info').innerText = `${userData.name}(${userData.studentId}) 님 환영합니다.`;
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
    document.getElementById('sort-new').className = (order === 'createdAt') ? 'px-4 py-2 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700' : 'px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition';
    document.getElementById('sort-vote').className = (order === 'upvotesCount') ? 'px-4 py-2 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700' : 'px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition';
    loadQuestions();
};

async function loadQuestions() {
    const qList = document.getElementById('question-list');
    qList.innerHTML = '<p class="text-center text-gray-500">질문을 불러오는 중입니다...</p>';

    try {
        const qQuery = query(collection(db, "questions"), where("section", "==", currentSection), orderBy(sortOrder, 'desc'));
        const snapshot = await getDocs(qQuery);
        qList.innerHTML = '';

        if(snapshot.empty) {
            qList.innerHTML = '<p class="text-center text-gray-500 py-10">아직 등록된 질문이 없습니다.</p>';
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
                        <input type="text" id="ans-input-${id}" class="flex-1 p-2 border rounded-lg text-sm" placeholder="답변을 입력하세요...">
                        <button onclick="submitAnswer('${id}')" class="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-black transition">등록</button>
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
    const aQuery = query(collection(db, "answers\), where("questionId", "==", questionId), orderBy("upvotesCount", 'desc'));
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
                    ${isOwnerOrAdmin ? `<button onclick="deleteItem('answers', '${id}')" class="text-xs text-gray-300 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>` : ''}
                </div>
            </div>
        `;
    });
}

window.submitAnswer = async (questionId) => {
    const content = document.getElementById(`ans-input-${questionId}`).value;
    if(!content) return alert("답변 내용을 입력해주세요.");
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const { name, studentId } = userDoc.data();

    await addDoc(collection(db, "answers"), {
        questionId, content, uid: currentUser.uid, authorName: name, authorStudentId: studentId,
        upvotesCount: 0, upvotedBy: [], createdAt: serverTimestamp()
    });
    document.getElementById(`ans-input-${questionId}`).value = '';
    loadAnswers(questionId);
};

window.submitAnswer = async (questionId) => {
    const content = document.getElementById(`ans-input-${questionId}`).value;
    if(!content) return alert("답변 내용을 입력해주세요.");
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const { name, studentId } = userDoc.data();

    await addDoc(collection(db, "answers"), {
        questionId, content, uid: currentUser.uid, authorName: name, authorStudentId: studentId,
        upvotesCount: 0, upvotedBy: [], createdAt: serverTimestamp()
    });
    document.getElementById(`ans-input-${questionId}`).value = '';
    loadAnswers(questionId);
};

window.upvote = async (col, id, hasUpvoted) => {
    const docRef = doc(db, col, id);
    const snap = await getDoc(docRef);
    if(!snap.exists()) return;
    const currentVotes = snap.data().upvotesCount || 0;
    await updateDoc(docRef, {
        upvotesCount: hasUpvoted ? currentVotes - 1 : currentVotes + 1,
        upvotedBy: hasUpvoted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
    loadQuestions();
};

window.deleteItem = async (col, id) => {
    if(confirm('정말 삭제하시겠습니까?')) {
        await deleteDoc(doc(db, col, id));
        loadQuestions();
    }
};

window.showAdminDashboard = async () => {
    showView('view-admin');
    const snap = await getDocs(collection(db, "users"));
    const list = document.getElementById('student-list');
    list.innerHTML = ' <p class="text-center text-gray-500">학생 목록을 불러오는 중입니다...</p>';
    snap.forEach(docSnap => {
        const u = docSnap.data();
        if(u.role === 'student') {
            list.innerHTML += `<tr class="border-bg-gray-50 border-b hover:bg-gray-50"><td class="p-4">${u.name}</td><td class="p-4">${u.studentId}</td><td class="p-4">${u.email}</td></tr>`;
        }
    });
};

window.showMain = () => showView('view-main');
window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add();
