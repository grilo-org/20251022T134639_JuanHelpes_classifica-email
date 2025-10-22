import React, { useState } from 'react';
import {
    Container,
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    CircularProgress,
    Tooltip,
    IconButton,
    Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import api from "../services/api"; // Importando a instância do Axios
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const classEmail: React.FC = () => {
    const [form, setForm] = useState({
        from: '',
        subject: '',
        body: '',
    });
    const [suggestedReply, setSuggestedReply] = useState('');
    const [classification, setClassification] = useState('');
    const [loading, setLoading] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editedReply, setEditedReply] = useState(suggestedReply);

    React.useEffect(() => {
        if (!editMode) setEditedReply(suggestedReply);
    }, [suggestedReply, editMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'application/pdf' || file.type === 'text/plain')) {
            setUploadedFile(file);
        } else {
            setUploadedFile(null);
        }
    };

    const handleSuggestReply = async () => {
        setLoading(true);
        setSuggestedReply('');
        setClassification('');
        setShowResult(true);
        try {
            const formData = new FormData();
            if (uploadedFile) {
                formData.append('file', uploadedFile);
            } else {
                formData.append('from_', form.from);
                formData.append('subject', form.subject);
                formData.append('body', form.body);
            }

            const response = await api.post('/process-email', formData);

            console.log('Resposta da API:', response.data);

            setSuggestedReply(
                `Para: ${response.data.model_output.para ? response.data.model_output.para : 'Não especificado'}\nAssunto: ${response.data.model_output.assunto ? response.data.model_output.assunto : 'Não especificado'}\n\n${response.data.model_output.resposta_sugerida}`
            );
            setClassification(response.data.model_output.classificacao);
            setShowResult(true);
        } catch (error) {
            toast.error('Erro ao gerar resposta: a API do Gemini apresentou instabilidade. Aguarde alguns instantes e tente novamente.', {
                position: "top-right",
                autoClose: 5000,
            });
            console.error('Erro ao sugerir resposta:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success('Email enviado com sucesso!', {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
        });
    };

    const handleNewSuggestion = () => {
        setForm({ from: '', subject: '', body: '' });
        setSuggestedReply('');
        setClassification('');
        setShowResult(false);
        setUploadedFile(null);
        setEditMode(false);
        setEditedReply('');
        // Reset file input value to allow re-uploading the same file
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => { (input as HTMLInputElement).value = ''; });
    };

    return (
        <>
            <ToastContainer />
            <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', Height: '100vh', gap: 2 }}>
                <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 4, mb: 2, marginBottom: 4 }}>
                        <Typography
                            variant="h4"
                            sx={{ fontWeight: 'bold', letterSpacing: 1, justifyItems: 'center' }}
                        >
                            Classificação de E-mail
                        </Typography>
                        <Tooltip placement='right' title="Insira o conteúdo de um e-mail digitando ou enviando um arquivo (.txt ou .pdf). Ao clicar em 'SUGERIR RESPOSTA', a IA analisará a mensagem, fará a classificação (Produtivo ou Improdutivo) e sugerirá uma resposta adequada." arrow>
                            <IconButton sx={{ ml: 2 }}>
                                <HelpOutlineIcon
                                    sx={{
                                        color: '#575454ff',
                                        fontSize: 32,
                                        padding: '2px',
                                    }}
                                />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Grid
                        container
                        spacing={4}
                        justifyContent="center"
                        alignItems="stretch"
                    >
                        <Grid size={{ xs: 12, md: showResult ? 6 : 7 }} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Paper elevation={3} sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                <Typography variant="h5" gutterBottom>
                                    Enviar Email
                                </Typography>
                                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ flexGrow: 1 }}>
                                    <TextField
                                        label="De"
                                        name="from"
                                        value={form.from}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="normal"
                                        required
                                        type="email"
                                        placeholder="exemplo@dominio.com"
                                    />
                                    <TextField
                                        label="Assunto"
                                        name="subject"
                                        value={form.subject}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="normal"
                                        required
                                    />
                                    <TextField
                                        label="Mensagem"
                                        name="body"
                                        value={form.body}
                                        onChange={handleChange}
                                        fullWidth
                                        margin="normal"
                                        required
                                        multiline
                                        rows={8}
                                    />

                                    <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
                                        <Divider sx={{ flex: 1 }} />
                                        <Typography sx={{ mx: 2, color: 'text.secondary', fontWeight: 'bold' }}>
                                            ou
                                        </Typography>
                                        <Divider sx={{ flex: 1 }} />
                                    </Box>

                                    {/* File upload field */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '100%',
                                            mb: 2,
                                        }}
                                    >
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            startIcon={<UploadFileIcon />}
                                            sx={{
                                                fontWeight: 'bold',
                                                textTransform: 'none',
                                                borderRadius: 2,
                                                bgcolor: uploadedFile ? '#e3f2fd' : undefined,
                                                borderColor: uploadedFile ? '#1976d2' : undefined,
                                                color: uploadedFile ? '#1976d2' : undefined,
                                                boxShadow: uploadedFile ? 2 : undefined,
                                            }}
                                        >
                                            {uploadedFile ? uploadedFile.name : 'Upload .txt ou .pdf'}
                                            <input
                                                type="file"
                                                accept=".txt,application/pdf"
                                                hidden
                                                onChange={handleFileChange}
                                            />
                                        </Button>
                                    </Box>

                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        sx={{ mt: 3, width: '100%', fontWeight: 'bold' }}
                                        onClick={handleSuggestReply}
                                        disabled={loading || (!form.body && !uploadedFile)}
                                        type="button"
                                    >
                                        Sugerir resposta
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>

                        {showResult && (
                            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
                                <Paper
                                    elevation={3}
                                    sx={{
                                        p: 3,
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    {loading ? (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                flexGrow: 1,
                                                width: '100%',
                                            }}
                                        >
                                            <CircularProgress size={48} />
                                        </Box>
                                    ) : (
                                        <Paper
                                            elevation={2}
                                            sx={{
                                                p: 2,
                                                m: 2,
                                                height: '100%',
                                                width: '90%',
                                                background: '#f5f7fa',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 'bold',
                                                    mb: 2,
                                                }}
                                            >
                                                <span role="img" aria-label="Análise" style={{ marginRight: 8 }}>
                                                    📊
                                                </span>
                                                Resultado da Análise
                                            </Typography>

                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
                                                Classificação:
                                            </Typography>
                                            <Typography variant="body1" sx={{ mb: 2 }}>
                                                {classification}
                                            </Typography>

                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
                                                Sugestão de Resposta:
                                            </Typography>

                                            {/** Editable suggestedReply field */}
                                            <Box sx={{ position: 'relative', width: '100%' }}>
                                                {
                                                    editMode ? (
                                                        <Box>
                                                            <TextField
                                                                multiline
                                                                minRows={8}
                                                                maxRows={12}
                                                                fullWidth
                                                                value={editedReply}
                                                                onChange={e => setEditedReply(e.target.value)}
                                                                sx={{
                                                                    fontFamily: 'monospace',
                                                                    backgroundColor: '#fff',
                                                                    whiteSpace: 'pre-line',
                                                                    wordBreak: 'break-word',
                                                                    mb: 2,
                                                                }}
                                                            />
                                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                                <Button
                                                                    variant="contained"
                                                                    color="primary"
                                                                    size="small"
                                                                    onClick={() => {
                                                                        setEditMode(false);
                                                                        setSuggestedReply(editedReply);
                                                                    }}
                                                                >
                                                                    Salvar
                                                                </Button>
                                                                <Button
                                                                    variant="outlined"
                                                                    color="secondary"
                                                                    size="small"
                                                                    onClick={() => {
                                                                        setEditMode(false);
                                                                        setEditedReply(suggestedReply);
                                                                    }}
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                            </Box>
                                                        </Box>
                                                    ) : (
                                                        <Box>
                                                            <Paper
                                                                variant="outlined"
                                                                sx={{
                                                                    p: 2,
                                                                    background: '#fff',
                                                                    mb: 2,
                                                                    flexGrow: 1,
                                                                    minHeight: 224,
                                                                    maxHeight: 224,
                                                                    overflowY: 'auto',
                                                                    overflowX: 'hidden',
                                                                    fontFamily: 'monospace',
                                                                    whiteSpace: 'pre-line',
                                                                    wordBreak: 'break-word',
                                                                    scrollbarWidth: 'thin',
                                                                    scrollbarColor: '#bdbdbd #f5f5f5',
                                                                    '&::-webkit-scrollbar': {
                                                                        width: '6px',
                                                                        backgroundColor: '#f5f5f5',
                                                                    },
                                                                    '&::-webkit-scrollbar-thumb': {
                                                                        backgroundColor: '#bdbdbd',
                                                                        borderRadius: '4px',
                                                                    },
                                                                }}
                                                            >
                                                                {suggestedReply}
                                                            </Paper>
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                onClick={() => setEditMode(true)}
                                                            >
                                                                Editar
                                                            </Button>
                                                        </Box>
                                                    )
                                                }
                                            </Box>

                                            <Box sx={{ flexGrow: 0 }} />
                                            <Grid container spacing={2} sx={{ mt: 'auto', marginBottom: 2 }}>
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                    <Button
                                                        type="submit"
                                                        variant="contained"
                                                        color="primary"
                                                        fullWidth
                                                        sx={{ fontWeight: 'bold' }}
                                                        onClick={handleSubmit}
                                                    >
                                                        Enviar Email
                                                    </Button>
                                                </Grid>
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                    <Button
                                                        variant="outlined"
                                                        color="secondary"
                                                        fullWidth
                                                        sx={{ fontWeight: 'bold' }}
                                                        onClick={handleNewSuggestion}
                                                        disabled={loading}
                                                        type="button"
                                                    >
                                                        Novo E-mail
                                                    </Button>
                                                </Grid>
                                            </Grid>
                                        </Paper>
                                    )}
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            </Container>
        </>
    );
};

export default classEmail;
