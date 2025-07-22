import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import './ClientDetailsPage.css';

// Função para formatar a data do timestamp do Firebase
const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'Data não disponível';
    return timestamp.toDate().toLocaleDateString('pt-BR');
};

export function ClientDetailsPage() {
    const { clientId } = useParams(); // Pega o ID do cliente da URL
    const [client, setClient] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    // --- INÍCIO DA ADIÇÃO DA LÓGICA DE ESTATÍSTICAS ---
    const clientStats = useMemo(() => {
        if (!appointments || appointments.length === 0) {
            return {
                totalVisits: 0,
                cancellations: 0,
                noShows: 0,
                mostFrequentService: 'Nenhum serviço realizado',
            };
        }

        const totalVisits = appointments.filter(app => app.status === 'Realizado').length;
        const cancellations = appointments.filter(app => app.status === 'Cancelado').length;
        const noShows = appointments.filter(app => app.status === 'NaoCompareceu').length;

        const completedServices = appointments.filter(app => app.status === 'Realizado');
        let mostFrequentService = 'Nenhum serviço realizado';

        if (completedServices.length > 0) {
            const serviceCounts = completedServices.reduce((acc, app) => {
                acc[app.serviceName] = (acc[app.serviceName] || 0) + 1;
                return acc;
            }, {});

            mostFrequentService = Object.keys(serviceCounts).reduce((a, b) =>
                serviceCounts[a] > serviceCounts[b] ? a : b
            );
        }

        return { totalVisits, cancellations, noShows, mostFrequentService };
    }, [appointments]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Busca os dados do cliente
                const clientDocRef = doc(db, 'users', clientId);
                const clientSnap = await getDoc(clientDocRef);

                if (!clientSnap.exists()) {
                    toast.error("Cliente não encontrado.");
                    setLoading(false);
                    return;
                }
                const clientData = { id: clientSnap.id, ...clientSnap.data() };
                setClient(clientData);
                setNotes(clientData.notes || '');

                // Busca os agendamentos do cliente
                const appointmentsQuery = query(
                    collection(db, 'agendamentos'),
                    where('userId', '==', clientId),
                    orderBy('date', 'desc') // Ordena por data, do mais recente para o mais antigo
                );
                const appointmentsSnap = await getDocs(appointmentsQuery);
                const appointmentsData = appointmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAppointments(appointmentsData);

            } catch (error) {
                console.error("Erro ao buscar dados do cliente:", error);
                toast.error("Falha ao carregar dados do cliente.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [clientId]);

    const handleSaveNotes = async () => {
        try {
            const clientDocRef = doc(db, 'users', clientId);
            await updateDoc(clientDocRef, { notes: notes });
            toast.success("Anotações salvas com sucesso!");
        } catch (error) {
            toast.error("Erro ao salvar anotações.");
            console.error("Erro ao salvar anotações:", error);
        }
    };

    if (loading) {
        return <div className="client-details-container"><p>Carregando perfil do cliente...</p></div>;
    }

    if (!client) {
        return <div className="client-details-container"><p>Não foi possível encontrar este cliente.</p></div>;
    }

    const completedAppointments = appointments.filter(app => app.status === 'Realizado').length;

    return (
        <div className="client-details-container">
            <div className="client-profile-header">
                <h1>{client.name}</h1>
                <Link to="/admin/kanban" className="back-to-kanban">← Voltar para a Jornada</Link>
            </div>

            <div className="profile-grid">
                <div className="profile-card kpi-card">
                    <h3>Estatísticas</h3>
                    <p><strong>Procedimentos Realizados:</strong> {clientStats.totalVisits}</p>
                    <p><strong>Cancelamentos:</strong> {clientStats.cancellations}</p>
                    <p><strong>Não Comparecimentos:</strong> {clientStats.noShows}</p>
                    <p><strong>Total de Agendamentos:</strong> {appointments.length}</p>
                    <p><strong>Cliente desde:</strong> {formatDate(client.createdAt)}</p>
                    <hr className="kpi-divider" />
                    <p><strong>Serviço Mais Realizado:</strong></p>
                    <p className="most-frequent">{clientStats.mostFrequentService}</p>
                </div>

                <div className="profile-card notes-card">
                    <h3>Anotações do Admin</h3>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Adicione anotações sobre o cliente (preferências, alergias, etc.)..."
                    />
                    <button onClick={handleSaveNotes}>Salvar Anotações</button>
                </div>

                <div className="profile-card history-card">
                    <h3>Histórico de Agendamentos</h3>
                    <div className="appointment-history-list">
                        {appointments.length > 0 ? (
                            appointments.map(app => (
                                <div key={app.id} className={`history-item status-${app.status?.toLowerCase()}`}>
                                    <div className="history-item-header">
                                        <strong>{app.serviceName}</strong>
                                        <span>{app.status}</span>
                                    </div>
                                    <div className="history-item-body">
                                        <span>{app.date} às {app.time}</span>
                                        <span>{app.servicePrice}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p>Nenhum agendamento encontrado para este cliente.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}