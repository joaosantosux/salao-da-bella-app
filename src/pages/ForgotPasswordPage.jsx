import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import './Auth.css';

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            return toast.error("Por favor, insira seu endereço de e-mail.");
        }
        try {
            await sendPasswordResetEmail(auth, email);
            toast.success("E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.");
        } catch (error) {
            toast.error("Erro ao enviar e-mail. Verifique se o endereço está correto.");
            console.error("Erro na recuperação de senha:", error);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form">
                <h2>Recuperar Senha</h2>
                <p>Digite o e-mail associado à sua conta e enviaremos um link para redefinir sua senha.</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="seuemail@exemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="auth-button">Enviar E-mail de Recuperação</button>
                </form>
                <div className="switch-auth-link">
                    <p>Lembrou da senha? <Link to="/login">Faça login</Link></p>
                </div>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;