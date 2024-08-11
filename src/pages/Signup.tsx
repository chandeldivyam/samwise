// .\src\pages\Signup.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { useGlobalContext } from '../contexts/GlobalContext';
import { User } from '../types/global';
import { ErrorComponent } from '../components/ErrorComponent';
import { ensureUserSettings  } from '../utils/appSettings';

const Signup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [signupOption, setSignupOption] = useState<'signup' | 'login'>('signup');
  const { setUser } = useGlobalContext();
  const [error, setError] = useState<string | null>(null); 

  const navigate = useNavigate();

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
  };

  const handleSignupOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSignupOption(event.target.value as 'signup' | 'login');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
        let user: User;

        if (signupOption === 'signup') {
            // Check if user already exists
            try {
                user = await invoke('get_user_by_name', { name: username });
                if (user) {
                    setError('User already exists! Please login or choose another username');
                    return;
                }
            } catch (error) {
                console.log("No user found, creating a new user");
            }

            const userId: number = await invoke('create_user', { user: { name: username } });
            user = await invoke('get_user', { id: userId });
        } else {
            // Login
            user = await invoke('get_user_by_name', { name: username });
            if (!user) {
                setError('User not found!');
                return;
            }
        }

        setUser(user);

        // Ensure user settings exist and update the context
        await ensureUserSettings(username, user.id);

        // Navigate to the main page after successful signup or login
        navigate('/');
    } catch (error) {
        setError('An error occurred during signup/login');
        console.error('Error during signup/login:', error);
    }
};
  return (
    <Box sx={{ maxWidth: 400, margin: 'auto', mt: 5 }}>
      <Typography variant="h4" gutterBottom>
        {signupOption === 'signup' ? 'Signup' : 'Login'}
      </Typography>
      {error && <ErrorComponent message={error} />}
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          margin="normal"
          label="Username"
          value={username}
          onChange={handleUsernameChange}
        />

        <FormControl component="fieldset" sx={{ mt: 2 }}>
          <RadioGroup
            row
            aria-label="signup-option"
            name="signup-option"
            value={signupOption}
            onChange={handleSignupOptionChange}
          >
            <FormControlLabel value="signup" control={<Radio />} label="Signup" />
            <FormControlLabel value="login" control={<Radio />} label="Login" />
          </RadioGroup>
        </FormControl>

        <Button type="submit" variant="contained" color="primary" sx={{ mt: 3 }}>
          {signupOption === 'signup' ? 'Create Account' : 'Login'}
        </Button>
      </form>
    </Box>
  );
};

export default Signup;